const express = require("express");
const LiveStream = require("../models/LiveStream");

const router = express.Router();

// GET ACTIVE LIVE STREAM
router.get("/", async (req, res) => {
  try {
    const streams = await LiveStream.find({
      isLive: true,
    })
      .sort({ startedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      streams,
    });
  } catch (error) {
    console.error(
      "Get live streams error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to get live streams",
    });
  }
});

// GET SINGLE LIVE STREAM
router.get("/:streamId", async (req, res) => {
  try {
    const stream =
      await LiveStream.findOne({
        streamId: req.params.streamId,
      });

    if (!stream) {
      return res.status(404).json({
        success: false,
        message: "Live stream not found",
      });
    }

    res.json({
      success: true,
      stream,
    });
  } catch (error) {
    console.error(
      "Get live stream error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to get live stream",
    });
  }
});

// END LIVE STREAM
router.patch(
  "/:streamId/end",
  async (req, res) => {
    try {
      const stream =
        await LiveStream.findOneAndUpdate(
          {
            streamId:
              req.params.streamId,
            isLive: true,
          },
          {
            isLive: false,
            endedAt: new Date(),
          },
          {
            new: true,
          }
        );

      if (!stream) {
        return res.status(404).json({
          success: false,
          message:
            "Active live stream not found",
        });
      }

      res.json({
        success: true,
        message:
          "Live stream ended successfully",
        stream,
      });
    } catch (error) {
      console.error(
        "End live stream error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to end live stream",
      });
    }
  }
);

module.exports = router;
