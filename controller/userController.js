
// import { client } from '../dbConfig.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// const myDB = client.db("olxClone");
// const Users = myDB.collection("users");

import nodemailer from 'nodemailer'
import otpGenerator from "otp-generator";
import { User } from '../model/User.js';
import mongoose from 'mongoose';
import { Post } from '../model/Post.js';
import { Comment } from '../model/Comment.js';
import { Like } from '../model/Like.js';
import { Follower } from '../model/Follower.js';
import { deleteImage } from '../utils/deleteImage.js';
import { populate } from 'dotenv';



export const updateUserProfile= async(req, res)=>{
  
  try{
    
    const    userId =req.user._id

    const updateData = { ...req.body };
    const profileImage = req.files?.profileimage?.[0] || null;
    const coverImage = req.files?.coverimage?.[0] || null;
    
    console.log("Profile Image:", profileImage);
    console.log("Cover Image:", coverImage);
   
    const StoredUser = await User.findById(userId);
    

    if (!StoredUser) {
      return res.status(500).send({
        status: 0,
        message: "User Not Found"
        })
      }   
    if(profileImage){

      if(updateData.profilePublicId){
        await deleteImage(updateData.profilePublicId);
      }
      delete updateData.profilePublicId;
      updateData.profileImage={image:profileImage.path, publicId:profileImage.filename}
    }
    if(coverImage){
// 
            if(updateData.coverPublicId){
        await deleteImage(updateData.coverPublicId);
      }
      delete updateData.coverPublicId;
      updateData.coverImage={image:coverImage.path, publicId:coverImage.filename}
    }
    console.log("update data",updateData);

// if (req.file) {
//   //console.log(updateData);
  
//   // 🗑️ Delete the old image from Cloudinary (if it exists)
//   if (updateData.imageId) {
//     await deleteImage(updateData.imageId);
//  delete updateData.imageId;
//   }


//   // 🌩️ Save the new image info
//   updateData.image = {
//     image: req.file.path, // Cloudinary hosted URL
//     publicId: req.file.filename, // Cloudinary public_id (used for deleting later)
//   };
// }
    
const userUpdate = await User.updateOne(
  { _id: userId },
  updateData,
  { runValidators: true }
);

if (userUpdate.modifiedCount > 0) {
  const user = await User.findOne(
    { _id: userId },
    { fullName: 1, email: 1, phone: 1, city: 1, country:1, bio:1, profileImage: 1, coverImage:1 }
  );

  return res.status(200).send({
    status: 1,
    message: "Profile updated successfully",
    data: user
  });
} else {
  return res.status(200).send({
    status: 1,
    message: "No changes made to profile",
  });
}

  }catch(error){

   return res.status(500).send({
    message: error.message,
    status: 0
  }) 
  }

}

export const createPost = async (req, res) => {
    
    
    const postData = { ...req.body };
let imageData;
if(req.file || req.files){
    imageData = req.files.map(file => ({
        imageUrl: file.path,       // Cloudinary URL
        publicId: file.filename,   // Cloudinary public_id
    }));
}

console.log(imageData);

const    userId =new ObjectId(req.user._id)


const StoredUser = await User.findOne({ _id: userId});


if (!StoredUser) {
    return res.status(500).send({
        status: 0,
        message: "User Not Found"
    })
}   

postData.images=imageData;
postData.user=userId;

console.log(postData);


const response = await Post.create(postData)
  .then(post => post.populate("user", "username profileImage"));


        if (response) {
            return res.status(201).send({
                message: "Post Uploded ",
                post:response,
                status: 1
            })
        }
        else {
            return res.status(500).send({
                message: "Something went wrong",
                status: 0
            })
        }

}
export const DeletePost = async (req, res) => {
  try {
    const postId = req.params.id;

    // 🔹 Find post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        status: 0,
        message: "Post not found",
      });
    }

    // 🔹 Delete images (Cloudinary)
    if (post.images?.length > 0) {
      for (const image of post.images) {
        await deleteImage(image.publicId);
      }
    }

    // 🔹 Delete comments
    await Comment.deleteMany({ post: postId });

    // 🔹 Delete likes
    await Like.deleteMany({ post: postId });

    // 🔹 Delete post
    await Post.deleteOne({ _id: postId });

    return res.status(200).json({
      status: 1,
      message: "Post deleted successfully",
      postId,
    });

  } catch (error) {
    console.error("DeletePost Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};


export const getPost = async (req, res) => {
  try {
const userId = req.user._id;

// Get all connections
const connections = await Follower.find({
  $or: [
    { follower: userId },
    { following: userId },
  ]
});

// Collect all connected user ids (including myself)
const includeIds = new Set();
includeIds.add(userId.toString());

connections.forEach(conn => {
  includeIds.add(conn.follower.toString());
  includeIds.add(conn.following.toString());
});

const userObjectIds = Array.from(includeIds).map(id => new mongoose.Types.ObjectId(id));

// Feed query
const posts = await Post.aggregate([

  // 🔹 Only posts from my network
  {
    $match: {
      user: { $in: userObjectIds }
    }
  },

  // 🔹 Latest first
  { $sort: { createdAt: -1 } },

  // 🔹 Post owner
  {
    $lookup: {
      from: "users",
      localField: "user",
      foreignField: "_id",
      as: "user",
    },
  },
  { $unwind: "$user" },

  // 🔹 Get comments
  {
    $lookup: {
      from: "comments",
      localField: "_id",
      foreignField: "post",
      as: "comments",
    },
  },

  // 🔹 Get comment users
  {
    $lookup: {
      from: "users",
      localField: "comments.user",
      foreignField: "_id",
      as: "commentUsers",
    },
  },

  // 🔹 Merge comment + user
  {
    $addFields: {
      comments: {
        $map: {
          input: "$comments",
          as: "comment",
          in: {
            _id: "$$comment._id",
            text: "$$comment.text",
            createdAt: "$$comment.createdAt",
            user: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$commentUsers",
                    as: "cu",
                    cond: { $eq: ["$$cu._id", "$$comment.user"] },
                  },
                },
                0,
              ],
            },
          },
        },
      },
    },
  },

  // 🔹 Get likes
  {
    $lookup: {
      from: "likes",
      localField: "_id",
      foreignField: "post",
      as: "likes",
    },
  },

  // 🔹 Counts + isLikedByMe
  {
    $addFields: {
      commentsCount: { $size: "$comments" },
      likesCount: { $size: "$likes" },
      isLikedByMe: { $in: [new mongoose.Types.ObjectId(userId), "$likes.user"] },
    },
  },

  // 🔹 Final response
  {
    $project: {
      content: 1,
      images: 1,
      createdAt: 1,

      user: {
        _id: 1,
        username: 1,
        profileImage: 1,
      },

      comments: {
        _id: 1,
        text: 1,
        createdAt: 1,
        "user._id": 1,
        "user.username": 1,
        "user.profileImage": 1,
      },

      commentsCount: 1,
      likesCount: 1,
      isLikedByMe: 1,
    },
  },
]);


    return res.status(200).json({
      status: 1,
      posts: posts,
    });

  } catch (error) {
    console.error("GetPost Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};



export const Post_on_Profile = async (req, res) => {
  try {
    const myId = req.user._id;
    const friendId = req.params.friendId;

    const userId = friendId ? friendId : myId;

    const objectUserId = new mongoose.Types.ObjectId(userId);

    console.log("Profile Posts For:", objectUserId);

    const posts = await Post.aggregate([
      // 🔹 Only profile posts
      { $match: { user: objectUserId } },

      // 🔹 Latest first
      { $sort: { createdAt: -1 } },

      // 🔹 Get post owner
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      // 🔹 Get comments
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comments",
        },
      },

      // 🔹 Get comment users
      {
        $lookup: {
          from: "users",
          localField: "comments.user",
          foreignField: "_id",
          as: "commentUsers",
        },
      },

      // 🔹 Attach user to each comment
      {
        $addFields: {
          comments: {
            $map: {
              input: "$comments",
              as: "comment",
              in: {
                _id: "$$comment._id",
                text: "$$comment.text",
                createdAt: "$$comment.createdAt",
                user: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$commentUsers",
                        as: "cu",
                        cond: { $eq: ["$$cu._id", "$$comment.user"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },

      // 🔹 Likes
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "post",
          as: "likes",
        },
      },

      // 🔹 Counts
      {
        $addFields: {
          commentsCount: { $size: "$comments" },
          likesCount: { $size: "$likes" },
          isLikedByMe: { $in: [objectUserId, "$likes.user"] },
        },
      },

      // 🔹 Final response
      {
        $project: {
          content: 1,
          images: 1,
          createdAt: 1,
          user: {
            _id: "$user._id",
            username: "$user.username",
            profileImage: "$user.profileImage",
          },
          comments: {
            _id: 1,
            text: 1,
            createdAt: 1,
            "user._id": 1,
            "user.username": 1,
            "user.profileImage": 1,
          },
          commentsCount: 1,
          likesCount: 1,
          isLikedByMe: 1,
        },
      },
    ]);

    if (!posts.length) {
      return res.status(200).json({
        status: 1,
        posts: [],
      });
    }

    return res.status(200).json({
      status: 1,
      posts,
    });

  } catch (error) {
    console.error("Post_on_Profile Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};



export const toggleLike = async (req, res) => {
  const { postId } = req.body;
  const userId = req.user._id; // from auth middleware
console.log(postId);

  const existingLike = await Like.findOne({ post: postId, user: userId });

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    return res.json({
      status: 1,
      message: "unliked",
      postId,
    });
  }

  await Like.create({ post: postId, user: userId });

  res.json({
    status: 1,
    message: "liked",
    postId
  });
};

export const toggleFollower = async (req, res) => {
  try {
    const { friendId } = req.body; // user to follow/unfollow
    const userId = req.user._id;   // current logged-in user

    // prevent self-follow
    if (userId.toString() === friendId) {
      return res.status(400).json({
        status: 0,
        message: "You cannot follow yourself",
      });
    }

    const existingFollow = await Follower.findOne({
      follower: userId,
      following: friendId,
    });

    // unfollow
    if (existingFollow) {
      await Follower.deleteOne({ _id: existingFollow._id });

      return res.json({
        status: 1,
        message: "User unfollowed",
        id:friendId
      });
    }

    // follow
    await Follower.create({
      follower: userId,
      following: friendId,
    });

   return res.json({
      status: 1,
      message: "User followed",
      id:friendId
    });
  } catch (error) {
    res.status(500).json({
      status: 0,
      message: "Something went wrong",
      error: error.message,
    });
  }
};


export const addComment = async (req, res) => {
  try{
  const {postId, text } = req.body;
  const userId = req.user._id;

    const setComment= await Comment.create({post:postId, user:userId, text:text})

     const populatedComment = await Comment.findById(setComment._id)
      .populate("user", "username profileImage"); 

    if(setComment){

          res.json({
        status: 1,
        message: "Comment added",
            postId:postId,
            comment:populatedComment
      });
    }
  }
    catch(error){
      console.log("error",error.message);
      
   return re,s.status(500).send({
    message:"something went wrong",
    status:0
   })   
}


      

};
export const updateComment = async (req, res) => {
  const { commentId,postId, text } = req.body;
  const userId = req.user._id;

  const comment = await Comment.findOne({
    _id: commentId,
    user: userId,
    post:postId 
  });


if (!comment) {
    return res.status(404).send({
      message:"Comment not found",
      status:0
    })
  }
 

      
      comment.text = text;
      await comment.save();
  return   res.status(200).send({
        status: 1,
        message: "Comment updated",
        comment: text,
        postId,
        commentId
      });
    

};
export const deleteComment = async (req, res) => {
  const { commentId, postId } = req.body;


  const comment = await Comment.findOne({
    _id: commentId,
    post:postId
  });

  if (!comment) {
    return res.status(404).send({
      message:"Message not found",
      status:0
    })
  }
    const delComment= await Comment.deleteOne({_id:comment._id, post:comment.post, user:comment.user})

    if(delComment){

          res.json({
        status: 1,
        message: "Comment deleted",
        commentId,
        postId:comment.post
      });
}
 
};

export const getAllUser = async (req, res) => {
  try {
    const myId = req.user._id;
const name= req.query.name||"";

    // get all relations (followers + following)
    const connections = await Follower.find({
      $or: [
        { follower: myId },
        { following: myId },
      ]
    });

    // collect all connected user ids
    const excludeIds = new Set();
    excludeIds.add(myId.toString());

    connections.forEach(conn => {
      excludeIds.add(conn.follower.toString());
      excludeIds.add(conn.following.toString());
    });

    const users = await User.aggregate([
      {
        $match: {
          _id: { 
            $nin: Array.from(excludeIds).map(id => new mongoose.Types.ObjectId(id))
          },
  username: {
            $regex: name,
            $options: "i"   // case-insensitive search
          }
        }
      },
      {
        $project: {
          username: 1,
          city: 1,
          country: 1,
          profileImage: 1,
          coverImage: 1,
        }
      }
    ]);

    return res.status(200).json({
      message: "USERS_FETCHED",
      users,
      status: 1,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
      status: 0,
    });
  }
};

// export const getMy = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const result = await User.aggregate([
//       {
//         $match: { _id: userId },
//       },

//       // 🔹 Friends (any connection)
//       {
//         $lookup: {
//           from: "followers",
//           let: { myId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $or: [
//                     { $eq: ["$follower", "$$myId"] },   // I follow them
//                     { $eq: ["$following", "$$myId"] }   // They follow me
//                   ]
//                 }
//               }
//             },
//             {
//               $project: {
//                 friendId: {
//                   $cond: [
//                     { $eq: ["$follower", "$$myId"] },
//                     "$following",
//                     "$follower"
//                   ]
//                 }
//               }
//             },
//             {
//               $group: {
//                 _id: "$friendId"
//               }
//             }
//           ],
//           as: "friendsIds"
//         }
//       },

//       // 🔹 Get friend profiles
//       {
//         $lookup: {
//           from: "users",
//           localField: "friendsIds._id",
//           foreignField: "_id",
//           as: "friends"
//         }
//       },

//       // 🔹 Friends count
//       {
//         $addFields: {
//           friendsCount: { $size: "$friends" }
//         }
//       },

//       // 🔹 Final response
//       {
//         $project: {
//           username: 1,
//           city: 1,
//           country: 1,
//           bio: 1,
//           profileImage: 1,
//           coverImage: 1,
//           friendsCount: 1,
//           friends: {
//             _id: 1,
//             username: 1,
//             profileImage: 1,
//             city: 1,
//             country: 1
//           }
//         }
//       }
//     ]);

//     if (!result.length) {
//       return res.status(404).json({
//         status: 0,
//         message: "User not found",
//       });
//     }

//     return res.status(200).json({
//       status: 1,
//       message: "User logged_in",
//       data: result[0],
//     });

//   } catch (error) {

//     return res.status(500).json({
//       status: 0,
//       message: "Something went wrong",
//     });
//   }
// };
export const getProfile = async (req, res) => {
  try {
    const myId = new mongoose.Types.ObjectId(req.user._id);
    const friendParamId = req.params.friendId;

    let profileId = myId;

    // 🔹 If friendId provided, validate friendship
    if (friendParamId) {
      const friendId = new mongoose.Types.ObjectId(friendParamId);

      const isFriend = await Follower.findOne({
        $or: [
          { follower: myId, following: friendId },
          { follower: friendId, following: myId }
        ]
      });

      if (!isFriend) {
        return res.status(403).json({
          status: 0,
          message: "This user is not your friend",
        });
      }

      profileId = friendId;
    }

    // 🔹 Get profile + friends
    const result = await User.aggregate([
      {
        $match: { _id: profileId }
      },

      {
        $lookup: {
          from: "followers",
          let: { myId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$follower", "$$myId"] },
                    { $eq: ["$following", "$$myId"] }
                  ]
                }
              }
            },
            {
              $project: {
                friendId: {
                  $cond: [
                    { $eq: ["$follower", "$$myId"] },
                    "$following",
                    "$follower"
                  ]
                }
              }
            },
            {
              $match: {
                friendId: { $ne: profileId }
              }
            },
            {
              $group: {
                _id: "$friendId"
              }
            }
          ],
          as: "friendsIds"
        }
      },

      {
        $lookup: {
          from: "users",
          localField: "friendsIds._id",
          foreignField: "_id",
          as: "friends"
        }
      },

      {
        $addFields: {
          friendsCount: { $size: "$friends" }
        }
      },

      {
        $project: {
          username: 1,
          city: 1,
          country: 1,
          bio: 1,
          profileImage: 1,
          coverImage: 1,
          friendsCount: 1,
          friends: {
            _id: 1,
            username: 1,
            profileImage: 1,
            city: 1,
            country: 1
          }
        }
      }
    ]);

    if (!result.length) {
      return res.status(404).json({
        status: 0,
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Profile fetched successfully",
      data: result[0],
      friends:result[0].friends
    });

  } catch (error) {
    console.error("GetProfile Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};
