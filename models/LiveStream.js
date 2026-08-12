const mongoose = require("mongoose");

const liveStreamSchema = new mongoose.Schema(
  {
    streamId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    username: {
      type: String,
      required: true,
    },

    profilePic: {
      type: String,
      default: "",
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    isLive: {
      type: Boolean,
      default: true,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    viewerCount: {
      type: Number,
      default: 0,
    },

    peakViewerCount: {
      type: Number,
      default: 0,
    },

    likeCount: {
      type: Number,
      default: 0,
    },

    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    comments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        username: {
          type: String,
        },

        profilePic: {
          type: String,
          default: "",
        },

        text: {
          type: String,
          required: true,
          maxlength: 300,
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "LiveStream",
  liveStreamSchema
);
