
const adminMiddleware = require("../middleware/adminMiddleware");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Story = require("../models/Story");
const Post = require("../models/Post");
const Reel = require("../models/Reel");
const Report = require("../models/Report");
const Admin = require("../models/Admin");



const router = express.Router();
router.get("/create-admin", async (req, res) => {
  try {
    const existingAdmin = await Admin.findOne({
      email: "admin@gmail.com",
    });

    if (existingAdmin) {
      return res.status(400).json({
        message: "Admin already exists",
      });
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = new Admin({
      email: "admin@gmail.com",
      password: hashedPassword,
    });

    await admin.save();

    res.status(201).json({
      message: "Admin created successfully",
    });
  } catch (error) {
    console.error("Create Admin Error:", error);

    res.status(500).json({
      message: "Failed to create admin",
    });
  }
});

// ADMIN LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!admin) {
      return res.status(401).json({
        message: "Invalid Admin Email",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      admin.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid Admin Password",
      });
    }

    const token = jwt.sign(
      {
        role: "admin",
        email: admin.email,
      },
      process.env.JWT_SECRET || "admin-secret-key",
      {
        expiresIn: "1d",
      }
    );

    res.json({
      message: "Admin Login Successful",
      token,
    });
  } catch (error) {
    console.error("Admin Login Error:", error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});
// GET TOTAL USERS
router.get("/stats/users", async (req, res) => {
try {
const totalUsers = await User.countDocuments();

res.json({
  totalUsers,
});

} catch (error) {
console.error("Users Count Error:", error);

res.status(500).json({
  message: "Failed to get total users",
});

}
});
// GET TOTAL POSTS
router.get("/stats/posts", async (req, res) => {
try {
const totalPosts = await Post.countDocuments();

res.json({
  totalPosts,
});

} catch (error) {
console.error("Posts Count Error:", error);

res.status(500).json({
  message: "Failed to get total posts",
});

}
});
// GET TOTAL REELS
router.get("/stats/reels", async (req, res) => {
try {
const totalReels = await Reel.countDocuments();

res.json({
  totalReels,
});

} catch (error) {
console.error("Reels Count Error:", error);

res.status(500).json({
  message: "Failed to get total reels",
});

}
});
// GET TOTAL REPORTS
router.get("/stats/reports", async (req, res) => {
try {
const totalReports = await Report.countDocuments();

res.json({
  totalReports,
});

} catch (error) {
console.error("Reports Count Error:", error);

res.status(500).json({
  message: "Failed to get total reports",
});

}
});
// GET ALL USERS
router.get("/users", async (req, res) => {
  try {

    const users = await User.find().select("-password");

    const usersWithData = await Promise.all(
      users.map(async (user) => {

        const postCount = await Post.countDocuments({
          user: user._id,
        });

        const reelCount = await Reel.countDocuments({
          user: user._id,
        });
        const posts = await Post.find({
  user: user._id,
}).limit(10);

const reels = await Reel.find({
  user: user._id,
}).limit(6);

        return {
          ...user._doc,
          postCount,
          reelCount,
          posts,
          reels,
        };
      })
    );

    res.json(usersWithData);

  } catch (error) {
    console.error("Users Fetch Error:", error);

    res.status(500).json({
      message: "Failed to fetch users",
    });
  }
});
// GET ALL POSTS
router.get("/posts", async (req, res) => {
  try {
    const Post = require("../models/Post");

    const posts = await Post.find()
      .populate("user", "name email profilePic")
      .sort({ createdAt: -1 });

    res.json(posts);

  } catch (error) {
    console.error("Posts Fetch Error:", error);

    res.status(500).json({
      message: "Failed to fetch posts",
    });
  }
});
// GET ALL REELS
router.get("/reels", async (req, res) => {
  try {
    const reels = await Reel.find()
      .populate("user", "name email profilePic")
      .sort({ createdAt: -1 });

    res.json(reels);

  } catch (error) {
    console.error("Admin Reels Fetch Error:", error);

    res.status(500).json({
      message: "Failed to fetch reels",
    });
  }
});
// DELETE USER
router.delete("/users/:id", async (req, res) => {
try {
const { id } = req.params;

await User.findByIdAndDelete(id);

res.json({
  message: "User deleted successfully",
});

} catch (error) {
console.error("Delete User Error:", error);

res.status(500).json({
  message: "Failed to delete user",
});

}
});
// BLOCK / UNBLOCK USER
router.put("/users/:id/block", async (req, res) => {
try {
const user = await User.findById(req.params.id);

if (!user) {
  return res.status(404).json({
    message: "User not found",
  });
}

user.isBlocked = !user.isBlocked;

await user.save();

res.json({
  message: user.isBlocked
    ? "User blocked successfully"
    : "User unblocked successfully",
  isBlocked: user.isBlocked,
});

} catch (error) {
console.error("Block User Error:", error);

res.status(500).json({
  message: "Failed to update user status",
});

}
});
// GET ALL REPORTS
router.get("/reports", async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reporter", "name email profilePic");

    for (const report of reports) {
      if (report.reportedModel === "Post") {
        report.reportedItem = await Post.findById(report.reportedItem)
          .populate("user", "name profilePic");
      }

      if (report.reportedModel === "Reel") {
        report.reportedItem = await Reel.findById(report.reportedItem)
          .populate("user", "name profilePic");
      }

      if (report.reportedModel === "User") {
        report.reportedItem = await User.findById(report.reportedItem)
          .select("name email profilePic bio");
      }
    }

    res.json(reports);

  } catch (error) {
    console.error("Reports Fetch Error:", error);

    res.status(500).json({
      message: "Failed to fetch reports",
    });
  }
});

// DELETE REPORT
router.delete("/reports/:id", async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);

    res.json({
      message: "Report deleted successfully",
    });

  } catch (error) {
    console.error("Delete Report Error:", error);

    res.status(500).json({
      message: "Failed to delete report",
    });
  }
});
// GET ALL COMMENTS
router.get("/comments", async (req, res) => {
  try {
    const allComments = [];

    // POSTS
    const posts = await Post.find()
      .populate("user", "name")
      .populate("comments.user", "name email profilePic");

    posts.forEach((post) => {
      post.comments.forEach((comment) => {
        allComments.push({
          _id: comment._id,
          type: "Post",
          text: comment.text,
          createdAt: comment.createdAt,
          user: comment.user,
          owner: post.user?.name,
          parentId: post._id,
          parentContent: post.content,
        });
      });
    });

    // REELS
    const reels = await Reel.find()
      .populate("user", "name")
      .populate("comments.user", "name email profilePic");

    reels.forEach((reel) => {
      reel.comments.forEach((comment) => {
        allComments.push({
          _id: comment._id,
          type: "Reel",
          text: comment.text,
          createdAt: comment.createdAt,
          user: comment.user,
          owner: reel.user?.name,
          parentId: reel._id,
          parentContent: reel.caption,
        });
      });
    });

    // STORIES
    const stories = await Story.find()
      .populate("user", "name")
      .populate("comments.user", "name email profilePic");

    stories.forEach((story) => {
      story.comments.forEach((comment) => {
        allComments.push({
          _id: comment._id,
          type: "Story",
          text: comment.text,
          createdAt: comment.createdAt,
          user: comment.user,
          owner: story.user?.name,
          parentId: story._id,
          parentContent: "Story",
        });
      });
    });

    res.json(allComments);

  } catch (error) {
    console.error("Comments Fetch Error:", error);

    res.status(500).json({
      message: "Failed to fetch comments",
    });
  }
});
// DELETE COMMENT
router.delete("/comments/:type/:parentId/:commentId", async (req, res) => {
  try {
    const { type, parentId, commentId } = req.params;

    let Model;

    if (type === "Post") Model = Post;
    else if (type === "Reel") Model = Reel;
    else if (type === "Story") Model = Story;
    else {
      return res.status(400).json({
        message: "Invalid type",
      });
    }

    await Model.findByIdAndUpdate(parentId, {
      $pull: {
        comments: {
          _id: commentId,
        },
      },
    });

    res.json({
      message: "Comment deleted successfully",
    });

  } catch (error) {
    console.error("Delete Comment Error:", error);

    res.status(500).json({
      message: "Failed to delete comment",
    });
  }
});
router.put("/change-password", adminMiddleware, async (req, res) => {
  try {
    console.log("ADMIN PASSWORD CHANGE REQUEST");
    console.log("ADMIN:", req.admin);

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    const admin = await Admin.findOne({
      email: req.admin.email,
    });

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      admin.password
    );

    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    admin.password = hashedPassword;

    await admin.save();

    console.log("ADMIN PASSWORD UPDATED");

    res.json({
      message: "Password changed successfully",
    });

  } catch (error) {
    console.error("Admin Password Error:", error);

    res.status(500).json({
      message: "Failed to change password",
      error: error.message,
    });
  }
});
const handleChangeAdminPassword = async () => {
  if (!currentPassword || !newPassword) {
    alert("Please enter current password and new password");
    return;
  }

  if (newPassword.length < 6) {
    alert("New password must be at least 6 characters");
    return;
  }

  try {
    const adminToken = localStorage.getItem("adminToken");

    if (!adminToken) {
      alert("Admin session expired. Please login again.");
      window.location.href = "/admin-login";
      return;
    }

    const response = await fetch(
      "https://social-media-backend-9fag.onrender.com/api/admin/change-password",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Password change failed");
      return;
    }

    alert("Admin password changed successfully");

    setCurrentPassword("");
    setNewPassword("");

  } catch (error) {
    console.error("Change Password Error:", error);
    alert("Server se connect nahi ho pa raha");
  }
};
// EXPORT USERS
router.get("/export/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json(users);

  } catch (error) {
    console.error("Export Users Error:", error);

    res.status(500).json({
      message: "Failed to export users",
    });
  }
});
router.get("/backup", async (req, res) => {
  try {
    const users = await User.find();
    const posts = await Post.find();

    const backupData = {
      users,
      posts,
      backupDate: new Date()
    };

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=database-backup.json"
    );

    res.setHeader(
      "Content-Type",
      "application/json"
    );

    res.json(backupData);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Backup failed"
    });
  }
});
router.get("/export/report", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();

    const report = [
      ["Report", "Count"],
      ["Total Users", totalUsers],
      ["Total Posts", totalPosts],
    ];

    const csv = report
      .map((row) => row.join(","))
      .join("\n");

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=admin-report.csv"
    );

    res.setHeader(
      "Content-Type",
      "text/csv"
    );

    res.send(csv);

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Report export failed"
    });
  }
});

module.exports = router;
