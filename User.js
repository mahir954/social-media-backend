const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    resetPasswordToken: {
  type: String,
  default: null,
},

resetPasswordExpires: {
  type: Date,
  default: null,
},
    profilePic: {
        type: String,
        default: ""
    
    },
    bio: {
        type: String,
        default: "",
        maxlength: 200,
    },
    followers: [
        {
            type:
            mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    following: [
        {
            type:
            mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    closeFriends: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
],
    blockedUsers: [
        {
            type:
            mongoose.Schema.Types.ObjectId,
        },
    ],
    followRequests: [
        {
            type:
            mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    isPrivate: {
        type: Boolean,
        default: false
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    activeStory: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Story",
  default: null,
},
     lastSeen: {
        type: Date,
        default: null
    },
}, {
    timestamps: true
});
module.exports = mongoose.model("User", userSchema);