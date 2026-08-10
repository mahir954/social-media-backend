const express = require("express");
const User = require("../models/User");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const Post = require("../models/Post");
const Reel = require("../models/Reel");
const Story = require("../models/Story");
const Note = require("../models/Note");
const Message = require("../models/Message");
const Report = require("../models/Report");
const Notification = require("../models/Notification");

const router = express.Router();
router.post("/register", async(req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await
        bcrypt.hash(password, 10);
        const user = new User({
            name,
            email,
            password: hashedPassword,
        });
        await user.save();
        res.status(201).json({
            message: "User registered successfully",
            user,
        });
    } catch (error) {
        res.status(500).json({
            message: "Registeration failed",
            error: error.message,
        });
    }
});
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await 
        User.findOne({ email });
        if (!user){
            return
            res.status(404).json({
                message: "User not found",
            });
        }
        const isPasswordMatch =await
        bcrypt.compare(password, user.password);
        if (!isPasswordMatch){
            return
            res.status(401).json({
                message: "Invalid password",
            });
        }
        if (user.isBlocked) {
  return res.status(403).json({
    message: "Your account has been blocked by the admin.",
  });
}
        user.isOnline = true;
        user.lastSeen = null;
        await user.save();
        const token = jwt.sign({
            userId: user._id},
            process.env.JWT_SECRET,
            );
        res.status(200).json({
            message: "Login successful", token, user,
        });
    } catch(error){
        res.status(500).json({
            message: "Login failed",
            error: error.message,
        });
    }
});
// FOLLOW USER / FOLLOW REQUEST
router.post("/:id/follow", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const targetUserId = req.params.id;

    if (currentUserId === targetUserId) {
      return res.status(400).json({
        message: "You cannot follow yourself",
      });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Already following
    if (
      currentUser.following.some(
        (id) => id.toString() === targetUserId
      )
    ) {
      return res.status(400).json({
        message: "Already following this user",
      });
    }

    // Private account
    if (targetUser.isPrivate) {
      // Already requested
      if (
        targetUser.followRequests.some(
          (id) => id.toString() === currentUserId
        )
      ) {
        return res.status(400).json({
          message: "Follow request already sent",
        });
      }

      // Add follow request
      targetUser.followRequests.push(currentUserId);

      await targetUser.save();

      // Notification
      await Notification.create({
        recipient: targetUserId,
        sender: currentUserId,
        type: "follow",
        message: "sent you a follow request",
      });

      return res.status(200).json({
        message: "Follow request sent successfully",
        requestSent: true,
      });
    }

    // Public account - Direct follow
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);

    await currentUser.save();
    await targetUser.save();

    // Notification
    await Notification.create({
      recipient: targetUserId,
      sender: currentUserId,
      type: "follow",
      message: "started following you",
    });

    res.status(200).json({
      message: "User followed successfully",
      requestSent: false,
      followers: targetUser.followers,
      following: currentUser.following,
    });
  } catch (error) {
    console.error("Follow Error:", error);

    res.status(500).json({
      message: "Failed to follow user",
      error: error.message,
    });
  }
});
// GET FOLLOW REQUESTS
router.get(
  "/follow-requests",
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(
        req.user.userId
      ).populate(
        "followRequests",
        "name email profilePic"
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.status(200).json({
        requests: user.followRequests,
      });
    } catch (error) {
      console.error(
        "Get Follow Requests Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch follow requests",
        error: error.message,
      });
    }
  }
);


// ACCEPT FOLLOW REQUEST
router.put(
  "/follow-requests/:id/accept",
  authMiddleware,
  async (req, res) => {
    try {
      const currentUserId =
        req.user.userId;

      const requesterId =
        req.params.id;

      const currentUser =
        await User.findById(
          currentUserId
        );

      const requester =
        await User.findById(
          requesterId
        );

      if (
        !currentUser ||
        !requester
      ) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      // Check request
      const requestExists =
        currentUser.followRequests.some(
          (id) =>
            id.toString() ===
            requesterId
        );

      if (!requestExists) {
        return res.status(400).json({
          message:
            "Follow request not found",
        });
      }

      // Remove request
      currentUser.followRequests =
        currentUser.followRequests.filter(
          (id) =>
            id.toString() !==
            requesterId
        );

      // Add follower
      currentUser.followers.push(
        requesterId
      );

      // Add following
      requester.following.push(
        currentUserId
      );

      await currentUser.save();
      await requester.save();

      // Notification
      await Notification.create({
        recipient:
          requesterId,
        sender:
          currentUserId,
        type: "follow",
        message:
          "accepted your follow request",
      });

      res.status(200).json({
        message:
          "Follow request accepted",
      });
    } catch (error) {
      console.error(
        "Accept Follow Request Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to accept follow request",
        error: error.message,
      });
    }
  }
);


// REJECT FOLLOW REQUEST
router.delete(
  "/follow-requests/:id/reject",
  authMiddleware,
  async (req, res) => {
    try {
      const currentUserId =
        req.user.userId;

      const requesterId =
        req.params.id;

      const currentUser =
        await User.findById(
          currentUserId
        );

      if (!currentUser) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      const requestExists =
        currentUser.followRequests.some(
          (id) =>
            id.toString() ===
            requesterId
        );

      if (!requestExists) {
        return res.status(400).json({
          message:
            "Follow request not found",
        });
      }

      // Remove request
      currentUser.followRequests =
        currentUser.followRequests.filter(
          (id) =>
            id.toString() !==
            requesterId
        );

      await currentUser.save();

      res.status(200).json({
        message:
          "Follow request rejected",
      });
    } catch (error) {
      console.error(
        "Reject Follow Request Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to reject follow request",
        error: error.message,
      });
    }
  }
);

 
// UNFOLLOW USER
router.post("/:id/unfollow", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const targetUserId = req.params.id;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Remove target user from following
    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== targetUserId
    );

    // Remove current user from target user's followers
    targetUser.followers = targetUser.followers.filter(
      (id) => id.toString() !== currentUserId
    );

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({
      message: "User unfollowed successfully",
      followers: targetUser.followers,
      following: currentUser.following,
    });

  } catch (error) {
    console.error("Unfollow Error:", error);

    res.status(500).json({
      message: "Failed to unfollow user",
      error: error.message,
    });
  }
});
// SEARCH USERS
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || !query.trim()) {
      return res.status(200).json({
        users: [],
      });
    }

    const users = await User.find({
      $or: [
        {
          name: {
            $regex: query.trim(),
            $options: "i",
          },
        },
        {
          email: {
            $regex: query.trim(),
            $options: "i",
          },
        },
      ],
    })
      .select("-password")
      .limit(20);

    res.status(200).json({
      message: "Users searched successfully",
      users,
    });
  } catch (error) {
    console.error("Search Users Error:", error);

    res.status(500).json({
      message: "Failed to search users",
      error: error.message,
    });
  }
});
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password")
    .populate("activeStory");

    res.status(200).json({
      message: "Users fetched successfully",
      users,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});
router.post("/logout", authMiddleware, async (req, res) => {
    try{
        await User.findByIdAndUpdate(
            req.user.userId,
            { isOnline: false,
                lastSeen: new Date(),
            }
        );
        res.status(200).json({
            message: "Logout successful",
        });
    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({
            message: "Logout failed",
            error: error.message,
        });
    }
});
router.get("/profile", authMiddleware, async (req,res) => {
    try {
        const user = await
        User.findById(req.user.userId).select("-password");
        if(!user){
            return
            res.status(404).json({
                message: "User not found",
            });
        }
        res.status(200).json({
            message: "Profile accessed successfully",
            user,
        });
    } catch(error){
        res.status(500).json({
            message: "Failed to get profile",
            error: error.message,
        });
    }
});
// UPDATE PROFILE
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, email, bio } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.name = name;
    user.email = email;
    user.bio = bio || "";

    // Profile picture agar upload ho rahi hai
    if (req.file) {
      user.profilePic = `/uploads/${req.file.filename}`;
    }

    await user.save();

    const updatedUser = await User.findById(
      req.user.userId
    ).select("-password");

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);

    res.status(500).json({
      message: "Failed to update profile",
      error: error.message,
    });
  }
});
// FOLLOW USER
router.post("/:id/follow", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const targetUserId = req.params.id;

    if (currentUserId === targetUserId) {
      return res.status(400).json({
        message: "You cannot follow yourself",
      });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (currentUser.following.includes(targetUserId)) {
      return res.status(400).json({
        message: "Already following this user",
      });
    }

    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({
      message: "User followed successfully",
      followers: targetUser.followers,
      following: currentUser.following,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to follow user",
      error: error.message,
    });
  }
});


// UNFOLLOW USER
router.post("/:id/unfollow", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const targetUserId = req.params.id;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== targetUserId
    );

    targetUser.followers = targetUser.followers.filter(
      (id) => id.toString() !== currentUserId
    );

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({
      message: "User unfollowed successfully",
      followers: targetUser.followers,
      following: currentUser.following,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to unfollow user",
      error: error.message,
    });
  }
});
// TOGGLE PUBLIC / PRIVATE ACCOUNT
router.put(
  "/privacy",
  authMiddleware,
  async (req, res) => {
    try {
      const { isPrivate } = req.body;

      if (typeof isPrivate !== "boolean") {
        return res.status(400).json({
          message:
            "isPrivate must be true or false",
        });
      }

      const user =
        await User.findByIdAndUpdate(
          req.user.userId,
          {
            isPrivate,
          },
          {
            new: true,
          }
        ).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.status(200).json({
        message: user.isPrivate
          ? "Account is now private"
          : "Account is now public",
        user,
      });
    } catch (error) {
      console.error(
        "Privacy Update Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update account privacy",
        error: error.message,
      });
    }
  }
);
// get user profile by id
router.get("/:id", async (req,res) => {
  try{
    const user = await User.findById(req.params.id)
    .select("-password")
      .populate("followers", "name email profilePic")
      .populate("following", "name email profilePic");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Fetch User Profile Error:", error);

    res.status(500).json({
      message: "Failed to fetch user profile",
      error: error.message,
    });
  }
});
// BLOCK USER
router.put("/block/:userId", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    const userToBlock = await User.findById(req.params.userId);

    if (!userToBlock) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (currentUser.blockedUsers.includes(userToBlock._id)) {
      return res.status(400).json({
        message: "User already blocked",
      });
    }

    currentUser.blockedUsers.push(userToBlock._id);

    // Follow relationship bhi remove
    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== userToBlock._id.toString()
    );

    currentUser.followers = currentUser.followers.filter(
      (id) => id.toString() !== userToBlock._id.toString()
    );

    userToBlock.following = userToBlock.following.filter(
      (id) => id.toString() !== currentUser._id.toString()
    );

    userToBlock.followers = userToBlock.followers.filter(
      (id) => id.toString() !== currentUser._id.toString()
    );

    await currentUser.save();
    await userToBlock.save();

    res.status(200).json({
      message: "User blocked successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to block user",
      error: error.message,
    });
  }
});

// UNBLOCK USER
router.put("/unblock/:userId", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    currentUser.blockedUsers =
      currentUser.blockedUsers.filter(
        (id) =>
          id.toString() !== req.params.userId.toString()
      );

    await currentUser.save();

    res.status(200).json({
      message: "User unblocked successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to unblock user",
      error: error.message,
    });
  }
});
// DELETE MY ACCOUNT - COMPLETE CLEANUP
router.delete("/account", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Delete user's posts
    await Post.deleteMany({
      user: userId,
    });

    // Delete user's reels
    await Reel.deleteMany({
      user: userId,
    });

    // Delete user's stories
    await Story.deleteMany({
      user: userId,
    });

    // Delete user's notes
    await Note.deleteMany({
      user: userId,
    });

    // Delete user's messages
    await Message.deleteMany({
      $or: [
        { sender: userId },
        { receiver: userId },
      ],
    });

    // Delete user's notifications
    await Notification.deleteMany({
      $or: [
        { recipient: userId },
        { sender: userId },
      ],
    });

    // Delete reports made by the user
    await Report.deleteMany({
      reporter: userId,
    });

    // Remove user from other users' relationships
    await User.updateMany(
      {},
      {
        $pull: {
          followers: userId,
          following: userId,
          followRequests: userId,
          blockedUsers: userId,
        },
      }
    );

    // Finally delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: "Account and all associated data deleted successfully",
    });
  } catch (error) {
    console.error("Delete Account Error:", error);

    res.status(500).json({
      message: "Failed to delete account",
      error: error.message,
    });
  }
});
  

module.exports = router;
