import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    console.log("MongoDB already connected");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI); // <-- just this
    isConnected = true;
    console.log("MongoDB Connected ✅");
  } catch (err) {
    console.error("MongoDB Connection Error ❌", err);
    throw err;
  }
};

// Optional events
mongoose.connection.on("error", (err) => {
  console.error("MongoDB Connection Error:", err);
});

mongoose.connection.on("connected", () => {
  console.log("Mongoose Connected Event ✅");
});
