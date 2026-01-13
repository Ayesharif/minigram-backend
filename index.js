import AuthRoutes from './routers/authRouter.js'
import UserRoutes from './routers/userRouter.js'
import express from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import cors from "cors"
import { connectDB } from './config.js';
dotenv.config()


// mongoose.connect(process.env.MONGO_URI)
// .then(() => console.log("DB Connected"))
// .catch((err) => console.log("DB Error:", err));

// mongoose.connection.on("error", err => {

//   console.log("err", err)

// })
// mongoose.connection.on("connected", (err, res) => {

//   console.log("mongoose is connected")

// })
const app = express()
// app.use(async (req, res, next) => {
//   await connectDB(); // ensure DB is connected before handling request
//   next();
// });

const port=process.env.PORT;



 app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://minigram-rust.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
 })
);
app.use(express.json());
  app.use(cookieParser());
app.use(AuthRoutes)
app.use(UserRoutes)
   

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error("Failed to connect to DB", err);
  });