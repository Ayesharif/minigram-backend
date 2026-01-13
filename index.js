import AuthRoutes from './routers/authRouter.js'
import UserRoutes from './routers/userRouter.js'
import express from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import cors from "cors"
dotenv.config()


mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("DB Connected"))
.catch((err) => console.log("DB Error:", err));

mongoose.connection.on("error", err => {

  console.log("err", err)

})
mongoose.connection.on("connected", (err, res) => {

  console.log("mongoose is connected")

})


const app = express()
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
   
  app.listen(port, () => {
    console.log("Server running at http://localhost:3000");
  });