import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { upload } from "../middleware/uploads.js";
import { addComment, createPost, deleteComment, DeletePost, getAllUser, getPost,  getProfile,  Post_on_Profile,  toggleFollower, toggleLike, updateComment, updateUserProfile } from "../controller/userController.js";

const router=express.Router();

router.post("/post", verifyToken, upload.array("images", 5), createPost);
router.post("/post/:id", verifyToken, DeletePost);
router.post("/managelike", verifyToken, toggleLike);
router.post("/addcomment", verifyToken, addComment);
router.post("/deletecomment", verifyToken, deleteComment);
router.post("/updatecomment", verifyToken, updateComment);
router.post("/managefollowers", verifyToken, toggleFollower);
router.get("/profile", verifyToken, getProfile);
router.get("/profile/:friendId", verifyToken, getProfile);
router.get("/posts", verifyToken, getPost);
router.get("/myposts", verifyToken, Post_on_Profile);
router.get("/posts/:friendId", verifyToken, Post_on_Profile);
router.get("/users", verifyToken, getAllUser);
router.post("/updateprofile",verifyToken,upload.fields([{name:"profileimage", maxCount:1}, {name:"coverimage", maxCount:1}]) ,updateUserProfile);

export default router;