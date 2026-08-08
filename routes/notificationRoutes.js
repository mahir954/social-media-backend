const express = require("express");
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// GET MY NOTIFICATIONS
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.userId,
    })
      .populate("sender", "name email profilePic")
      .populate("story", "media mediaType")
      .populate("post", "content image")
      .populate("reel", "video caption")
      .sort({ createdAt: -1 });

    res.status(200).json({
      notifications,
    });
  } catch (error) {
    console.error("Fetch Notifications Error:", error);

    res.status(500).json({
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
});

// MARK NOTIFICATION AS READ
router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    notification.isRead = true;

    await notification.save();

    res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);

    res.status(500).json({
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
});

module.exports = router;
