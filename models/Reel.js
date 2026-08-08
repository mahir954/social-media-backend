const mongoose = require("mongoose");
const reelSchema = new mongoose.Schema(
    {
        user: {
            type:
            mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        video: {
            type: String,
            required: true,

        },
        caption: {
            type: String,
            default: "",

        },
        music: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Music",
  default: null,
},
        likes: [
            {
                type:
                mongoose.Schema.Types.ObjectId,
                ref: "User",
            },

        ],
        views: {
            type: Number,
            default: 0,
        },
        savedBy: [
            {
                type:
                mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        comments: [
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    text: {
      type: String,
      required: true,
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
module.exports = mongoose.model("Reel", reelSchema);
