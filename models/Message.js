const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema(
    {
        sender: {
            type:
            mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,

        },
        receiver: {
            type:
            mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
            default: "",
        },
        fileUrl: {
            type: String,
            default: null,
        },
        fileName: {
            type: String,
            default: null,
        },
        fileType: {
            type: String,
            default: null,
        },
        isRead: {
            type: Boolean,
            default: false
        },
        replyTo: {
            type:
            mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },
        reactions: {
            type: [String],
            default: [],
        },
        edited: {
            type: Boolean,
            default: false,
        },
        storyReply: {
            type: Boolean,
            default: false,
        },
        storyMedia: {
            type: String,
            default: null,
        },
        story: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Story",
  default: null,
},
note: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Note",
  default: null,
},

messageType: {
  type: String,
  enum: ["text", "image", "file", "voice", "story", "note_reply"],
  default: "text",
},
    },
    {
        timestamps: true,
    }
);
module.exports = mongoose.model("Message", messageSchema);
