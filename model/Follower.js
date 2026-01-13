import mongoose from "mongoose";

const followerSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// prevent duplicate follow
followerSchema.index({ follower: 1, following: 1 }, { unique: true });

export const Follower= mongoose.model("Follower", followerSchema);
