const express = require("express");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const Story = require("../models/Story");
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");
const Message = require("../models/Message");

const router = express.Router();


// STORAGE


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
});


// CREATE STORY


router.post(
  "/",
  authMiddleware,
  upload.single("media"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please upload an image or video",
        });
      }

      const mediaType = req.file.mimetype.startsWith("video")
        ? "video"
        : "image";
        const { musicId, mentions, isCloseFriends, } = req.body;
        let mentionUsers = [];

if (mentions) {
  try {
    mentionUsers = JSON.parse(mentions);
  } catch (error) {
    mentionUsers = [];
  }
}

const story = new Story({
  user: req.user.userId,
  media: `/uploads/${req.file.filename}`,
  mediaType,
  music: musicId ? musicId : null,
  mentions: mentionUsers,
  isCloseFriends: isCloseFriends === "true",
});
const savedStory = await story.save();

await User.findByIdAndUpdate(req.user.userId, {
  activeStory: savedStory._id,
});
    
      // Mention notification
if (mentionUsers.length > 0) {
  for (const mentionedUser of mentionUsers) {
    if (mentionedUser !== req.user.userId) {
      await Notification.create({
        recipient: mentionedUser,
        sender: req.user.userId,
        type: "story_mention",
        story: savedStory._id,
        message: "mentioned you in their story",
      });
       
      
    }
  }
}
for (const mentionedUser of mentionUsers) {
  if (mentionedUser !== req.user.userId) {
    await Message.create({
      sender: req.user.userId,
      receiver: mentionedUser,
      text: "📸 Mentioned you in a story",
      storyReply: true,
      storyMedia: story.media,
      story: story._id,
      messageType: "story",
    });
  }
}

      const populatedStory = await Story.findById(
        story._id
      ).populate(
        "user",
        "name email profilePic"
      );

      res.status(201).json({
        message: "Story uploaded successfully",
        story: populatedStory,
      });
    } catch (error) {
  console.log("CREATE STORY ERROR:", error);

  res.status(500).json({
    message: error.message,
  });
}
  }
);

 router.post("/add-mentioned", authMiddleware, async (req, res) => {
  try {
    const { storyId } = req.body;

    const oldStory = await Story.findById(storyId);

    if (!oldStory) {
      return res.status(404).json({
        message: "Story not found",
      });
    }

    const newStory = new Story({
      user: req.user.userId,
      media: oldStory.media,
      mediaType: oldStory.mediaType,
      music: oldStory.music || null,
      mentions: [],
      isCloseFriends: false,
    });

    const savedStory = await newStory.save();

    await User.findByIdAndUpdate(req.user.userId, {
      activeStory: savedStory._id,
    });

    res.status(201).json({
      message: "Story added successfully",
      story: savedStory,
    });

  } catch (error) {
    console.error("Add Mentioned Story Error:", error);

    res.status(500).json({
      message: "Failed to add story",
      error: error.message,
    });
  }
});


// GET ALL ACTIVE STORIES

router.get("/", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const stories = await Story.find()
      .populate(
        "user",
        "name email profilePic followers following closeFriends isPrivate"
      )
      .populate(
        "music",
        "title artist audioUrl"
      )
      .populate(
        "viewers",
        "name email profilePic"
      )
      .populate(
  "mentions",
  "name email profilePic"
)
      .populate(
        "likes",
        "name email profilePic"
      )
      .populate(
        "comments.user",
        "name email profilePic"
      )
      .sort({ createdAt: -1 });

    // Sirf allowed stories show hongi
    const visibleStories = stories.filter((story) => {
      if (!story.user) return false;

      // Apni story hamesha dikhegi
      if (
        story.user._id.toString() ===
        currentUserId.toString()
      ) {
        return true;
      }

      // Public account ki story sabko dikhegi
      if (!story.user.isPrivate) {
        return true;
      }
      // Close Friends story
if (story.isCloseFriends) {
  return story.user.closeFriends?.some(
    (id) =>
      (id._id || id).toString() ===
      currentUserId.toString()
  );
}

      // Private account ki story sirf approved followers ko
      return story.user.followers.some(
        (follower) =>
          (follower._id || follower).toString() ===
          currentUserId.toString()
      );
    });

    res.status(200).json({
      message: "Stories fetched successfully",
      stories: visibleStories,
    });
  } catch (error) {
    console.error(
      "Fetch Stories Error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch stories",
      error: error.message,
    });
  }
});


// DELETE STORY


router.delete("/:id", authMiddleware, async (req, res) => {
  try {

    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        message: "Story not found",
      });
    }

    // Sirf story owner delete kar sakta hai
    if (
      story.user.toString() !==
      req.user.userId
    ) {
      return res.status(403).json({
        message:
          "You can delete only your own story",
      });
    }
    await User.findByIdAndUpdate(story.user, {
  activeStory: null,
});

    await Story.findByIdAndDelete(
      req.params.id
    );

    res.status(200).json({
      message:
        "Story deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Story Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to delete story",
      error: error.message,
    });
  }
});
// ADD STORY TO HIGHLIGHTS
router.put("/:id/highlight", authMiddleware, async (req, res) => {
  try {
    const { highlightTitle } = req.body;

    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        message: "Story not found",
      });
    }

    // Sirf story owner hi highlight kar sakta hai
    if (story.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "You can highlight only your own story",
      });
    }

    story.isHighlight = true;
    story.highlightTitle = highlightTitle || "My Highlights";

    await story.save();

    const updatedStory = await Story.findById(story._id)
      .populate("user", "name email profilePic")
      .populate("viewers", "name email profilePic");

    res.status(200).json({
      message: "Story added to highlights successfully",
      story: updatedStory,
    });
  } catch (error) {
    console.error("Add Highlight Error:", error);

    res.status(500).json({
      message: "Failed to add story to highlights",
      error: error.message,
    });
  }
});


// VIEW STORY


router.put(
  "/:id/view",
  authMiddleware,
  async (req, res) => {
    try {
      const story = await Story.findById(
        req.params.id
      );

      if (!story) {
        return res.status(404).json({
          message:
            "Story not found",
        });
      }

      const userId =
        req.user.userId;

      // Apni story ka view count nahi badhega
      if (
        story.user.toString() ===
        userId
      ) {
        return res.status(200).json({
          message:
            "Own story",
          viewers:
            story.viewers,
        });
      }

      // Same user ko dobara count nahi karna
      if (
        !story.viewers.some(
          (id) =>
            id.toString() ===
            userId
        )
      ) {
        story.viewers.push(
          userId
        );

        await story.save();
      }

      res.status(200).json({
        message:
          "Story viewed successfully",
        viewers:
          story.viewers,
      });
    } catch (error) {
      console.error(
        "View Story Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to view story",
        error: error.message,
      });
    }
  }
);


// STORY REACTION


router.put(
  "/:id/reaction",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        reaction,
      } = req.body;

      const story =
        await Story.findById(
          req.params.id
        );

      if (!story) {
        return res.status(404).json({
          message:
            "Story not found",
        });
      }

      const userId =
        req.user.userId;

      const allowedReactions = [
        "❤️",
        "😂",
        "😮",
        "😢",
        "🔥",
      ];

      if (
        !allowedReactions.includes(
          reaction
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid reaction",
        });
      }

      // Check existing reaction
      const existingReaction =
        story.reactions.find(
          (item) =>
            item.user.toString() ===
            userId
        );

      if (existingReaction) {
        // Same reaction par remove
        if (
          existingReaction.reaction ===
          reaction
        ) {
          story.reactions =
            story.reactions.filter(
              (item) =>
                item.user.toString() !==
                userId
            );
        } else {
          // Different reaction par update
          existingReaction.reaction =
            reaction;
        }
      } else {
        // New reaction
        story.reactions.push({
          user: userId,
          reaction,
        });
      }

      await story.save();

      const updatedStory =
        await Story.findById(
          story._id
        )
          .populate(
            "user",
            "name email profilePic"
          )
          .populate(
            "reactions.user",
            "name email profilePic"
          );

      res.status(200).json({
        message:
          "Reaction updated successfully",
        story:
          updatedStory,
      });
    } catch (error) {
      console.error(
        "Story Reaction Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update reaction",
        error: error.message,
      });
    }
  }
);
// GET STORY HIGHLIGHTS
router.get(
  "/highlights/:userId",
  authMiddleware,
  async (req, res) => {
    try {
      const stories = await Story.find({
        user: req.params.userId,
        isHighlight: true,
      })
        .populate(
          "user",
          "name email profilePic"
        )
        .sort({ createdAt: -1 });

      // Highlight title ke according group
      const groupedHighlights = {};

      stories.forEach((story) => {
        const title =
          story.highlightTitle ||
          "My Highlights";

       if (!groupedHighlights[title]) {
  groupedHighlights[title] = {
    title,
    cover: story.media,
    user: story.user,
    stories: [],
  };
}

        groupedHighlights[title].stories.push(
          story
        );
      });

      const highlights =
        Object.values(
          groupedHighlights
        );

      res.status(200).json({
        highlights,
      });
    } catch (error) {
      console.error(
        "Get Highlights Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch highlights",
        error: error.message,
      });
    }
  }
);
// LIKE / UNLIKE STORY
router.put("/:id/like", authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        message: "Story not found",
      });
    }

    const userId = req.user.userId;

    // Story owner apni story ko like nahi kar sakta
    if (story.user.toString() === userId.toString()) {
      return res.status(400).json({
        message: "You cannot like your own story",
      });
    }

    const alreadyLiked = story.likes.some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyLiked) {
      // Unlike
      story.likes = story.likes.filter(
        (id) => id.toString() !== userId.toString()
      );

      // Like notification delete
      await Notification.findOneAndDelete({
        recipient: story.user,
        sender: userId,
        type: "story_like",
        story: story._id,
      });
    } else {
      // Like
      story.likes.push(userId);

      // Create notification
      await Notification.create({
        recipient: story.user,
        sender: userId,
        type: "story_like",
        story: story._id,
        message: "liked your story",
      });
    }

    await story.save();

    const updatedStory = await Story.findById(story._id)
      .populate("user", "name email profilePic")
      .populate("likes", "name email profilePic")
      .populate(
        "comments.user",
        "name email profilePic"
      )
      .populate(
        "reactions.user",
        "name email profilePic"
      );

    res.status(200).json({
      message: alreadyLiked
        ? "Story unliked successfully"
        : "Story liked successfully",
      story: updatedStory,
    });
  } catch (error) {
    console.error("Story Like Error:", error);

    res.status(500).json({
      message: "Failed to like story",
      error: error.message,
    });
  }
});


// ADD STORY COMMENT
router.post("/:id/comment", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Comment text is required",
      });
    }

    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        message: "Story not found",
      });
    }

    const userId = req.user.userId;

    // Comment add
    story.comments.push({
      user: userId,
      text: text.trim(),
    });

    await story.save();

    // Story owner ko comment notification
    // Apni story par khud comment karne par notification nahi banegi
    if (story.user.toString() !== userId.toString()) {
      await Notification.create({
        recipient: story.user,
        sender: userId,
        type: "story_comment",
        story: story._id,
        message: "commented on your story",
      });
    }

    const updatedStory = await Story.findById(story._id)
      .populate("user", "name email profilePic")
      .populate("likes", "name email profilePic")
      .populate(
        "comments.user",
        "name email profilePic"
      )
      .populate(
        "reactions.user",
        "name email profilePic"
      );

    res.status(200).json({
      message: "Comment added successfully",
      story: updatedStory,
    });
  } catch (error) {
    console.error("Story Comment Error:", error);

    res.status(500).json({
      message: "Failed to add comment",
      error: error.message,
    });
  }
});

module.exports = router;
