import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select:false,
      trim:true,
      default: null
    },

    bio: {
      type: String,
      maxlength: 150,
      default: null
    },
    city:{
      type: String,
      default:null
    },
    country:{
      type: String,
      default:null
    },
    otp: {
      type: String,   // or Number
      default: null,
      required: false,
    },

    isVerified: {
        type: Boolean,
        default: false,
    },
 profileImage: {
      image: { type: String, required: false, default: null },     // Cloudinary URL
      publicId: { type: String, required: false, default: null },  // Cloudinary public ID
    },
coverImage: {
      image: { type: String, required: false, default: null },     // Cloudinary URL
      publicId: { type: String, required: false, default: null },  // Cloudinary public ID
    },

  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
