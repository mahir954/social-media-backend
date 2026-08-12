const express = require("express");
const multer = require("multer");
const path = require("path");
const Music = require("../models/Music");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/music"));
  },

  filename: function (req, file, cb) {
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

// GET ALL MUSIC
router.get("/", async (req, res) => {
  try {
    const music = await Music.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      music,
    });
  } catch (error) {
    console.error("Fetch Music Error:", error);

    res.status(500).json({
      message: "Failed to fetch music",
    });
  }
});

// ADD MUSIC
router.post(
  "/upload",
  adminMiddleware,
  upload.single("audio"),
  async (req, res) => {
    try {
      const { title, artist, audioUrl } = req.body;

      if (!req.file && !audioUrl) {
        return res.status(400).json({
          message: "Please upload an audio file or provide an audio URL",
        });
      }

      if (req.file && audioUrl) {
        return res.status(400).json({
          message: "Please use either audio file or audio URL, not both",
        });
      }

      let finalAudioUrl = "";

      if (req.file) {
        finalAudioUrl = `/uploads/music/${req.file.filename}`;
      } else {
        finalAudioUrl = audioUrl;
      }

      const music = new Music({
        title,
        artist,
        audioUrl: finalAudioUrl,
      });

      await music.save();

      res.status(201).json({
        message: "Music added successfully",
        music,
      });
    } catch (error) {
      console.error("Music Upload Error:", error);

      res.status(500).json({
        message: "Failed to add music",
      });
    }
  }
);
// DELETE MUSIC
router.delete("/:id", adminMiddleware, async (req, res) => {
  try {
    const music = await Music.findByIdAndDelete(req.params.id);

    if (!music) {
      return res.status(404).json({
        message: "Music not found",
      });
    }

    res.status(200).json({
      message: "Music deleted successfully",
    });
  } catch (error) {
    console.error("Delete Music Error:", error);

    res.status(500).json({
      message: "Failed to delete music",
    });
  }
});

module.exports = router;
