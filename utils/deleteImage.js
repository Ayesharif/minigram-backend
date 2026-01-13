// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";

// // Define __dirname manually for ES Modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// export const deleteImage = (relativeImagePath) => {
//   return new Promise((resolve, reject) => {
//     if (!relativeImagePath) {
//       return reject( Error("No image path provided"));
//     }

//     // Construct absolute path (e.g., ../uploads/abc.jpg)
//     const imagePath = path.join(__dirname, `../${relativeImagePath}`);

//     fs.unlink(imagePath, (err) => {
//       if (err) {
//         console.error("❌ Error unlinking image:", err.message);
//         return reject(err);
//       }
//       //console.log("🗑️ Image deleted:", relativeImagePath);
//       resolve("Image deleted successfully!");
//     });
//   });
// };


import cloudinary from "../middleware/cloudinary.js";

export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "ok") {
      //console.log("🗑️ Image deleted:", publicId);
      return true;
    } else {
      console.warn("⚠️ No image deleted or already gone:", publicId);
      return false;
    }
  } catch (err) {
    console.error("❌ Error deleting image:", err.message);
    throw err;
  }
};