// models/Like.js
import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// prevent duplicate likes
likeSchema.index({ post: 1, user: 1 }, { unique: true });

export const Like = mongoose.model("Like", likeSchema);
