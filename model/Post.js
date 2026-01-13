import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    images: [{
imageUrl: { type: String, required: false, default: null },     // Cloudinary URL
      publicId: { type: String, required: false, default: null },  // Cloudinary public ID
    }],
  },
  { timestamps: true }
);

export const Post= mongoose.model("Post", postSchema);
