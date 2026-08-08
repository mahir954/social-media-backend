const express = require("express");
const Note = require("../models/Note");
const authMiddleware = require("../middleware/authMiddleware");
const Message = require("../models/Message");
const Notification = require("../models/Notification");

const router = express.Router();


// CREATE NOTE
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Note text is required",
      });
    }

    const note = new Note({
      user: req.user.userId,
      text: text.trim(),
    });

    await note.save();

    res.status(201).json({
      message: "Note created successfully",
      note,
    });

  } catch (error) {
    console.error("Create Note Error:", error);

    res.status(500).json({
      message: "Failed to create note",
      error: error.message,
    });
  }
});


// GET ALL ACTIVE NOTES
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notes = await Note.find({
      expiresAt: {
        $gt: new Date(),
      },
    })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json({
      notes,
    });

  } catch (error) {
    console.error("Get Notes Error:", error);

    res.status(500).json({
      message: "Failed to fetch notes",
      error: error.message,
    });
  }
});


// DELETE NOTE
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    if (note.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "You can delete only your note",
      });
    }

    await Note.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Note deleted successfully",
    });

  } catch (error) {
    console.error("Delete Note Error:", error);

    res.status(500).json({
      message: "Failed to delete note",
      error: error.message,
    });
  }
});
// UPDATE NOTE
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    if (note.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "You can update only your note",
      });
    }

    if (!text || !text.trim()) {
  return res.status(400).json({
    message: "Note text is required",
  });
}

note.text = text.trim();
    note.createdAt = new Date();
    note.expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    await note.save();

    res.status(200).json({
      message: "Note updated successfully",
      note,
    });
  } catch (error) {
    console.error("Update Note Error:", error);

    res.status(500).json({
      message: "Failed to update note",
      error: error.message,
    });
  }
});
// REPLY TO NOTE
router.post("/:id/reply", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: "Reply message is required",
      });
    }

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    // Save reply inside note
    note.replies.push({
      sender: req.user.userId,
      message: message.trim(),
    });

    await note.save();

    // Send same reply in DM
    await Message.create({
      sender: req.user.userId,
      receiver: note.user,
      text: message.trim(),
      messageType: "note_reply",
      note: note._id,
    });
    await Notification.create({
  recipient: note.user,
  sender: req.user.userId,
  type: "note_reply",
  message: "replied to your note",
});

    res.status(200).json({
      message: "Reply sent successfully",
      note,
    });

  } catch (error) {
    console.error("Reply Note Error:", error);

    res.status(500).json({
      message: "Failed to reply to note",
      error: error.message,
    });
  }
});
// LIKE / UNLIKE NOTE
router.post("/:id/like", authMiddleware, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    const alreadyLiked = note.likes.some(
      (id) => id.toString() === req.user.userId
    );

    if (alreadyLiked) {
      note.likes = note.likes.filter(
        (id) => id.toString() !== req.user.userId
      );
    } else {
      note.likes.push(req.user.userId);

      if (note.user.toString() !== req.user.userId) {
        await Notification.create({
          recipient: note.user,
          sender: req.user.userId,
          type: "note_like",
          message: "liked your note",
        });
      }
    }

    await note.save();

    res.status(200).json({
      message: alreadyLiked
        ? "Note unliked"
        : "Note liked",
      likes: note.likes.length,
    });
  } catch (error) {
    console.error("Like Note Error:", error);

    res.status(500).json({
      message: "Failed to like note",
      error: error.message,
    });
  }
});

module.exports = router;
