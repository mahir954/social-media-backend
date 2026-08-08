const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
{
reporter: {
type: mongoose.Schema.Types.ObjectId,
ref: "User",
required: true,
},

type: {
  type: String,
  enum: ["post", "reel", "user", "comment"],
  required: true,
},

reportedItem: {
  type: mongoose.Schema.Types.ObjectId,
  required: true,
  refPath: "reportedModel",
},

reportedModel: {
  type: String,
  required: true,
  enum: ["Post", "Reel", "User", "Comment"],
},

reason: {
  type: String,
  required: true,
},

status: {
  type: String,
  enum: ["pending", "reviewed", "resolved", "ignored"],
  default: "pending",
},

},
{
timestamps: true,
}
);

module.exports = mongoose.model("Report", reportSchema);
