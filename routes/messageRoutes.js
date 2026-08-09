const express = require("express");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../uploadMiddleware");

const router = express.Router();


// Send Message
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      receiver,
      text,
      replyTo,
      storyReply,
      storyMedia,
      story,
      messageType,
    } = req.body;

    if (!receiver || !text || !text.trim()) {
      return res.status(400).json({
        message: "Receiver and message text are required",
      });
    }

    const newMessage = new Message({
      sender: req.user.userId,
      receiver: receiver,
      text: text.trim(),
      replyTo: replyTo || null,
      storyReply: storyReply || false,
      storyMedia: storyMedia || null,
      story: story || null,
      messageType: messageType || "text",
    });

    const savedMessage = await newMessage.save();

    res.status(201).json({
      message: "Message sent successfully",
      data: savedMessage,
    });
  } catch (error) {
    console.error("Send Message Error:", error);

    res.status(500).json({
      message: "Failed to send message",
      error: error.message,
    });
  }
});


// Upload Image/File
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please select a file",
        });
      }

      const newMessage = new Message({
        sender: req.user.userId,
        receiver: req.body.receiver,
        text: "",
        fileUrl: /uploads/${req.file.filename},
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
      });

      const savedMessage = await newMessage.save();

      res.status(200).json({
        message: "File uploaded successfully",
        data: savedMessage,
        file: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: /uploads/${req.file.filename},
          mimetype: req.file.mimetype,
        },
      });
    } catch (error) {
      console.error("File Upload Error:", error);

      res.status(500).json({
        message: "Failed to upload file",
        error: error.message,
      });
    }
  }
);


// React to Message
router.put("/:messageId/react", authMiddleware, async (req, res) => {
  try {
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({
        message: "Reaction is required",
      });
    }

    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (message.reactions.includes(reaction)) {
      message.reactions = message.reactions.filter(
        (item) => item !== reaction
      );
    } else {
      message.reactions.push(reaction);
    }

    await message.save();

    res.status(200).json({
      message: "Reaction added successfully",
      data: message,
    });
  } catch (error) {
    console.error("Reaction Error:", error);

    res.status(500).json({
      message: "Failed to add reaction",
      error: error.message,
    });
  }
});


// Edit Message
router.put("/:messageId", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Message text is required",
      });
    }

    const message = await Message.findById(
      req.params.messageId
    );

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (
      message.sender.toString() !==
      req.user.userId.toString()
    ) {
      return res.status(403).json({
        message: "You can only edit your own messages",
      });
    }

    message.text = text.trim();
    message.edited = true;

    const updatedMessage = await message.save();

    res.status(200).json({
      message: "Message updated successfully",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Edit Message Error:", error);

    res.status(500).json({
      message: "Failed to edit message",
      error: error.message,
    });
  }
});


// Delete Message
router.delete("/:messageId", authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(
      req.params.messageId
    );

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (
      message.sender.toString() !==
      req.user.userId.toString()
    ) {
      return res.status(403).json({
        message: "You can only delete your own messages",
      });
    }

    await Message.findByIdAndDelete(
      req.params.messageId
    );

    res.status(200).json({
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete Message Error:", error);

    res.status(500).json({
      message: "Failed to delete message",
      error: error.message,
    });
  }
});


// Unsend Message
router.put("/:messageId/unsend", authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(
      req.params.messageId
    );

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (
      message.sender.toString() !==
      req.user.userId.toString()
    ) {
      return res.status(403).json({
        message: "You can only unsend your own messages",
      });
    }

    message.text = "This message was unsent";
    message.edited = false;

    await message.save();

    res.status(200).json({
      message: "Message unsent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Unsend Message Error:", error);

    res.status(500).json({
      message: "Failed to unsend message",
      error: error.message,
    });
  }
});


// Mark Messages as Read
router.put("/read/:userId", authMiddleware, async (req, res) => {
  try {
    const myUserId = req.user.userId;
    const otherUserId = req.params.userId;

    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: myUserId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    res.status(200).json({
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Mark Read Error:", error);

    res.status(500).json({
      message: "Failed to mark messages as read",
    });
  }
});


// Get Unread Message Count
router.get("/unread/count", authMiddleware, async (req, res) => {
  try {
    const myUserId = req.user.userId;

    const unreadCount = await Message.countDocuments({
      receiver: myUserId,
      isRead: false,
    });

    res.status(200).json({
      unreadCount,
    });
  } catch (error) {
    console.error("Unread Message Count Error:", error);

    res.status(500).json({
      message: "Failed to get unread message count",
      error: error.message,
    });
  }
});


// Get Chat Messages
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const myUserId = req.user.userId;
    const otherUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        {
          sender: myUserId,
          receiver: otherUserId,
        },
        {
          sender: otherUserId,
          receiver: myUserId,
        },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json({
      messages: messages,
    });
  } catch (error) {
    console.error("Get Messages Error:", error);

    res.status(500).json({
      message: "Failed to get messages",
      error: error.message,
    });
  }
});


module.exports = router;
