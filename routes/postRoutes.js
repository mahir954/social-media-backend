const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const authMiddleware = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");
const upload = require("../uploadMiddleware");
const { TbArrowAutofitUp } = require("react-icons/tb");
router.post("/", authMiddleware,
    upload.single("image"),
    async (req, res) => {
    try{
        const { content, musicId } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : "";
        if (!content){
            return
            res.status(400).json({
                message: "Content is required",

            });
        }
        const post = await Post.create({
            content,
            image,
            user: req.user.userId,
            music: musicId || null,
        });
        res.status(201).json({
            message: "Post created successfully",
            post,
        });
    } catch (error){
        res.status(500).json({
        message: "Failed to create post",
        error: error.message,
        });
    }
});
router.get("/", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const blockedUserIds = currentUser.blockedUsers || [];

    const posts = await Post.find()
      .populate(
        "user",
        "name email profilePic followers following isPrivate"
      )
      .populate(
        "music",
        "title artist audioUrl coverImage"
      )
      .sort({ createdAt: -1 });

    const visiblePosts = posts.filter((post) => {
      if (!post.user) {
        return false;
      }

      // Blocked users ke posts hide
      if (
        blockedUserIds.some(
          (blockedId) =>
            blockedId.toString() ===
            post.user._id.toString()
        )
      ) {
        return false;
      }

      // Apne posts hamesha dikhenge
      if (
        post.user._id.toString() ===
        currentUserId.toString()
      ) {
        return true;
      }

      // Public account
      if (!post.user.isPrivate) {
        return true;
      }

      // Private account - sirf followers
      return post.user.followers.some(
        (follower) =>
          (follower._id || follower).toString() ===
          currentUserId.toString()
      );
    });

    res.status(200).json({
      message: "Posts fetched successfully",
      posts: visiblePosts,
    });
  } catch (error) {
    console.error("Fetch Posts Error:", error);

    res.status(500).json({
      message: "Failed to fetch posts",
      error: error.message,
    });
  }
});
router.delete("/:id", authMiddleware, async (req, res) => {
    try{
        const post = await
       Post.findById(req.params.id);
        if(!post){
            return 
            res.status(404).json({
                message: "Post not found",
            });
        }
        
        if (post.user.toString() !== req.user.userId){
            return res.status(403).json({
                message: "You can delete only your own post",
            });
        }
        await
        Post.findByIdAndDelete(req.params.id);
        res.status(200).json({
            message: "Post deleted successfully",

        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete post",
            error: error.message,
        });
    }
});
router.put("/:id", authMiddleware, async (req, res) =>{
    try{
        const{ content } = req.body;
        const post = await
        Post.findById(req.params.id);
        if(!post){
            return
            res.status(404).json({
                message: "Post not found",

            });
        }
        if(post.user.toString() !== req.user.userId){
            return
            res.status(403).json({
                message: "You can update only your own post",
            });
        }
        post.content = content;
        await post.save();
        
        res.status(200).json({
            message: "Post updated successfully",
            post,

        });
    } catch (error){
        res.status(500).json({
            message: "Failed to update post",
        });
    }
});
router.post("/:id/like", authMiddleware, async(req, res) => {
    try{
        const post = await
        Post.findById(req.params.id);
        if(!post){
            return
            res.status(404).json({
                message: "Post not found",

            });
        }
        if(post.likes.includes(req.user.userId)){
            return
            res.status(400).json({
                message: "Post already liked",
            });
        }
        post.likes.push(req.user.userId);
        await post.save();
        if (post.user.toString() !== req.user.userId){
            await Notification.create({
                recipient: post.user,
                sender: req.user.userId,
                type: "like",
                post: post._id,
                message: "liked your post",
            });
        }

        res.status(200).json({
            message: "Post liked successfully",
            likes: post.likes,       
         });
    } catch (error) {
        res.status(500).json({
            message: "Failed to like post",
            error: error.message,
        });
    }
});
router.post("/:id/unlike", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    post.likes = post.likes.filter(
      (userId) => userId.toString() !== req.user.userId
    );

    await post.save();

    res.status(200).json({
      message: "Post unliked successfully",
      likes: post.likes,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to unlike post",
      error: error.message,
    });
  }
});
router.post("/:id/comment", authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        const post = await
        Post.findById(req.params.id);
        
        if(!post){
            return res.status(404).json({
                message: "Post not found",
            });
        }
         if(!post.comments){
            post.comments = [];
        }
        if (!text){
            return
            res.status(400).json({
                message: "Comment text is required",

            });
        }
        post.comments = post.comments || [];
        post.comments.push({
            user: req.user.userId,
            text: text,
        });
        await post.save();
        if (post.user.toString() !== req.user.userId){
            await Notification.create({
                recipient: post.user,
                sender: req.user.userId,
                type: "comment",
                post: post._id,
                message: "comment on your post",
            });
        }
        res.status(201).json({
            message: "Comment added successfully",
            comments: post.comments,
        });
    } catch(error) {
        res.status(500).json({
            message: "Failed to add comment",
            error: error.message,
        });
    }

});

      
    router.get("/:id/comments", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("comments.user", "name email profilePic");

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    res.status(200).json({
      message: "Comments fetched successfully",
      comments: post.comments,
    });
  } catch (error) {
    console.error("Fetch Comments Error:", error);

    res.status(500).json({
      message: "Failed to fetch comments",
      error: error.message,
    });
  }
});

router.put("/:postId/comment/:commentId", authMiddleware, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const comment = post.comments.find(
      (comment) => comment._id.toString() === commentId
    );

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (comment.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "You can edit only your own comment",
      });
    }

    comment.text = text;

    await post.save();

    res.status(200).json({
      message: "Comment updated successfully",
      comments: post.comments,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update comment",
      error: error.message,
    });
  }
});
module.exports = router;
