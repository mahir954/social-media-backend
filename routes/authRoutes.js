
const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const router = express.Router();
const uploadDir = path.join(__dirname, "../uploads/profile");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
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
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

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
      message: "Registration failed",
      error: error.message,
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isPasswordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }
    console.log("Blocked Status:", user.isBlocked);
    if (user.isBlocked) {
  return res.status(403).json({
    message: "Your account has been blocked by the admin.",
  });
}

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
});

// PROFILE
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password")
    .populate("followers", "name email profilePic")
    .populate("following", "name email profilePic");


    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Profile accessed successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get profile",
      error: error.message,
    });
  }
});
//update profile
router.put(
  "/profile",
  authMiddleware,
  upload.single("profilePic"),
  async (req, res) => {
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
      // Agar new profile picture upload hui hai
      if (req.file) {
        user.profilePic = `/uploads/profile/${req.file.filename}`;
      }

      await user.save();

      res.status(200).json({
        message: "Profile updated successfully",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          bio: user.bio,
          profilePic: user.profilePic,
        },
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to update profile",
        error: error.message,
      });
    }
  }
);
router.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isPasswordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    user.password = hashedPassword;

    await user.save();

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change Password Error:", error);

    res.status(500).json({
      message: "Failed to change password",
      error: error.message,
    });
  }
});


// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    res.status(200).json({
      message: "Password reset token generated successfully",
      resetToken,
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);

    res.status(500).json({
      message: "Failed to process forgot password",
      error: error.message,
    });
  }
});

// RESET PASSWORD
router.put("/reset-password/:token", async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        message: "New password is required",
      });
    }

    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);

    res.status(500).json({
      message: "Failed to reset password",
      error: error.message,
    });
  }
});
module.exports = router;
