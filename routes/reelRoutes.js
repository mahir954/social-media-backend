const express = require("express");
const user = require("../models/User");
const Reel = require("../models/Reel");
const authMiddleware = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");
const Music = require("../models/Music");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
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
  storage: storage,
});

const router = express.Router();
router.get("/", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const reels = await Reel.find()
      .populate(
        "user",
        "name email profilePic followers following isPrivate"
      )
      .populate(
        "comments.user",
        "name email profilePic"
      )
      .populate(
        "music",
        "title artist audioUrl coverImage"
      )
      .sort({ createdAt: -1 });

    // Sirf allowed Reels show hongi
    const visibleReels = reels.filter((reel) => {
      if (!reel.user) return false;

      // Apni Reel hamesha dikhegi
      if (
        reel.user._id.toString() ===
        currentUserId.toString()
      ) {
        return true;
      }

      // Public account ki Reel sabko dikhegi
      if (!reel.user.isPrivate) {
        return true;
      }

      // Private account ki Reel sirf approved followers ko
      return reel.user.followers.some(
        (follower) =>
          (follower._id || follower).toString() ===
          currentUserId.toString()
      );
    });

    res.status(200).json({
      message: "Reels fetched successfully",
      reels: visibleReels,
    });
  } catch (error) {
    console.error(
      "Fetch Reels Error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch reels",
      error: error.message,
    });
  }
});
const fetchSavedReels = async () => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      `"http://192.168.43.245:5000/api/reels/saved/me"`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.ok) {
      setReels(data.reels);
    }
  } catch (error) {
    console.error("Fetch Saved Reels Error:", error);
  }
};

// CREATE REEL
router.post("/", authMiddleware,
    upload.single("video"),
     async (req, res) => {
  try {
    const { caption, musicId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message: "Video is required",
      });
    }

    const reel = new Reel({
      user: req.user.userId,
      video: req.file.filename,
      caption,
      music: musicId || null,
    });

    await reel.save();

    res.status(201).json({
      message: "Reel created successfully",
      reel,
    });
  } catch (error) {
    console.error("Create Reel Error:", error);

    res.status(500).json({
      message: "Failed to create reel",
      error: error.message,
    });
  }
});
// EDIT REEL CAPTION
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { caption } = req.body;

    const reel = await Reel.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({
        message: "Reel not found",
      });
    }

    // Sirf reel ka owner edit kar sakta hai
    if (reel.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "You can edit only your own reel",
      });
    }

    reel.caption = caption || "";

    await reel.save();

    const updatedReel = await Reel.findById(reel._id)
      .populate("user", "name email profilePic")
      .populate("comments.user", "name email profilePic")
      .populate(
        "comments.user",
        "name email profilePic"
      )

    res.status(200).json({
      message: "Reel updated successfully",
      reel: updatedReel,
    });
  } catch (error) {
    console.error("Edit Reel Error:", error);

    res.status(500).json({
      message: "Failed to edit reel",
      error: error.message,
    });
  }
});
// EDIT REEL COMMENT
router.put(
  "/:reelId/comment/:commentId",
  authMiddleware,
  async (req, res) => {
    try {
      const { text } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({
          message: "Comment cannot be empty",
        });
      }

      const reel = await Reel.findById(req.params.reelId);

      if (!reel) {
        return res.status(404).json({
          message: "Reel not found",
        });
      }

      const comment = reel.comments.id(req.params.commentId);

      if (!comment) {
        return res.status(404).json({
          message: "Comment not found",
        });
      }

      // Sirf comment ka owner edit kar sakta hai
      if (comment.user.toString() !== req.user.userId) {
        return res.status(403).json({
          message: "You can edit only your own comment",
        });
      }

      comment.text = text.trim();

      await reel.save();

      const updatedReel = await Reel.findById(reel._id)
        .populate("user", "name email profilePic")
        .populate("comments.user", "name email profilePic");

      res.status(200).json({
        message: "Comment updated successfully",
        reel: updatedReel,
      });
    } catch (error) {
      console.error("Edit Reel Comment Error:", error);

      res.status(500).json({
        message: "Failed to edit comment",
        error: error.message,
      });
    }
  }
);
// DELETE REEL
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({
        message: "Reel not found",
      });
    }

    // Sirf reel ka owner delete kar sakta hai
    if (reel.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "You can delete only your own reel",
      });
    }
    const videoPath = path.join(
  __dirname,
  "..",
  "uploads",
  reel.video
);

if (fs.existsSync(videoPath)) {
  fs.unlinkSync(videoPath);
}

    await Reel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Reel deleted successfully",
    });
  } catch (error) {
    console.error("Delete Reel Error:", error);

    res.status(500).json({
      message: "Failed to delete reel",
      error: error.message,
    });
  }
});
// LIKE / UNLIKE REEL
router.put("/:id/like", authMiddleware, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({
        message: "Reel not found",
      });
    }

    const userId = req.user.userId;

    const alreadyLiked = reel.likes.some(
      (id) => id.toString() === userId
    );

    if (alreadyLiked) {
      reel.likes = reel.likes.filter(
        (id) => id.toString() !== userId
      );

      // Delete like notification when unliked
      await Notification.findOneAndDelete({
        recipient: reel.user,
        sender: userId,
        reel: reel._id,
        type: "like",
      });
    } else {
      reel.likes.push(userId);

      // Don't notify yourself
      if (reel.user.toString() !== userId) {
        await Notification.create({
          recipient: reel.user,
          sender: userId,
          type: "like",
          reel: reel._id,
          message: "liked your reel",
        });
      }
    }

    await reel.save();

    res.status(200).json({
      message: alreadyLiked
        ? "Reel unliked"
        : "Reel liked",
      likes: reel.likes,
    });
  } catch (error) {
    console.error("Like Reel Error:", error);

    res.status(500).json({
      message: "Failed to like reel",
      error: error.message,
    });
  }
});
// GET REEL LIKES
router.get("/:id/likes", async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id)
      .populate("likes", "name profilePic");

    if (!reel) {
      return res.status(404).json({
        message: "Reel not found",
      });
    }

    res.status(200).json({
      likes: reel.likes,
    });
  } catch (error) {
    console.error("Fetch Reel Likes Error:", error);

    res.status(500).json({
      message: "Failed to fetch reel likes",
      error: error.message,
    });
  }
});
// INCREMENT REEL VIEW
router.put("/:id/view", async (req, res) => {
  try {
    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      {
        $inc: { views: 1 },
      },
      { new: true }
    );

    if (!reel) {
      return res.status(404).json({
        message: "Reel not found",
      });
    }

    res.status(200).json({
      views: reel.views,
    });
  } catch (error) {
    console.error("Reel View Error:", error);

    res.status(500).json({
      message: "Failed to update views",
      error: error.message,
    });
  }
});
// SAVE / UNSAVE REEL
router.put("/:id/save", authMiddleware, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({
        message: "Reel not found",
      });
    }

    const userId = req.user.userId;

    const alreadySaved = reel.savedBy.some(
      (id) => id.toString() === userId
    );

    if (alreadySaved) {
      reel.savedBy = reel.savedBy.filter(
        (id) => id.toString() !== userId
      );
    } else {
      reel.savedBy.push(userId);
    }

    await reel.save();

    res.status(200).json({
      savedBy: reel.savedBy,
    });
  } catch (error) {
    console.error("Save Reel Error:", error);

    res.status(500).json({
      message: "Failed to save reel",
      error: error.message,
    });
  }
});
// GET SAVED REELS
router.get("/saved/me", authMiddleware, async (req, res) => {
  try {
    const reels = await Reel.find({
      savedBy: req.user.userId,
    })
      .populate("user", "name profilePic")
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json({
      reels,
    });
  } catch (error) {
    console.error("Fetch Saved Reels Error:", error);

    res.status(500).json({
      message: "Failed to fetch saved reels",
      error: error.message,
    });
  }
});
// ADD COMMENT TO REEL
router.post("/:id/comment", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Comment cannot be empty",
      });
    }

    const reel = await Reel.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({
        message: "Reel not found",
      });
    }

    const userId = req.user.userId;

    reel.comments.push({
      user: userId,
      text: text.trim(),
    });

    await reel.save();

    // Create comment notification
    // Don't notify yourself
    if (reel.user.toString() !== userId) {
      await Notification.create({
        recipient: reel.user,
        sender: userId,
        type: "comment",
        reel: reel._id,
        message: "commented on your reel",
      });
    }

    const updatedReel = await Reel.findById(reel._id)
      .populate("user", "name profilePic")
      .populate("comments.user", "name profilePic");

    res.status(200).json({
      message: "Comment added successfully",
      reel: updatedReel,
    });
  } catch (error) {
    console.error("Add Reel Comment Error:", error);

    res.status(500).json({
      message: "Failed to add comment",
      error: error.message,
    });
  }
});
// DELETE REEL COMMENT
router.delete(
  "/:reelId/comment/:commentId",
  authMiddleware,
  async (req, res) => {
    try {
      const reel = await Reel.findById(req.params.reelId);

      if (!reel) {
        return res.status(404).json({
          message: "Reel not found",
        });
      }

      const comment = reel.comments.id(req.params.commentId);

      if (!comment) {
        return res.status(404).json({
          message: "Comment not found",
        });
      }

      if (comment.user.toString() !== req.user.userId) {
        return res.status(403).json({
          message: "You can delete only your own comment",
        });
      }

      comment.deleteOne();

      await reel.save();

      res.status(200).json({
        message: "Comment deleted successfully",
      });
    } catch (error) {
      console.error("Delete Reel Comment Error:", error);

      res.status(500).json({
        message: "Failed to delete comment",
        error: error.message,
      });
    }
  }
);

module.exports = router;
