
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

export const register = async (req, res) => {
    const { userName, password, email, city, country } = req.body;
    if (!userName || !password || !email || !city || !country) {

        return res.status(400).send({
            message: "please fill out complete form",
            status: 0
        })

    }
    else {
        const userEmail = email.toLowerCase();

        const emailFormat = /^[a-zA-Z0-9_.+]+(?<!^[0-9]*)@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

        const passwordValidation = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

        if (!userEmail.match(emailFormat) || !password.match(passwordValidation)) {

            return res.status(400).send({
                message: "invalid email or password",
                status: 0
            })
        }

        const checkUser = await User.findOne({ email: userEmail })

        if (checkUser) {
            return res.status(409).send({
                message: "Email already exist",
                status: 0
            })
        }


        const hashedPassword = await bcrypt.hashSync(req.body.password)
        const user = {
            username: userName,
            email: userEmail,
            city: city,
            country: country,
            password: hashedPassword
        }


        const response = await User.create(user);
        if (response) {
            return res.status(201).send({
                message: "REGISTER_SUCCESS",
                email: userEmail,
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

}

export const login = async (req, res) => {


    if (!req.body.password || !req.body.email) {
        return res.status(400).send({
            status: 0,
            message: "Email or Password is required"
        })
    }

    const email = req.body.email.toLowerCase()
    const emailFormat = /^[a-zA-Z0-9_.+]+(?<!^[0-9]*)@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

    if (!email.match(emailFormat)) {
        return res.status(400).send({
            status: 0,
            message: "Email is Invalid"
        })
    }
    const user = await User.findOne({ email: email }).select("+password")
    console.log(user);

    if (!user) {
        return res.status(400).send({
            status: 0,
            message: "Email is not registered!"
        })
    }
    const matchPassword = await bcrypt.compareSync(req.body.password, user.password)
    if (!matchPassword) {
        return res.status(401).send({
            status: 0,
            message: "Email or Password is incorrect"
        })
    }
    const token = await jwt.sign({
        _id: user._id,
        email,
        userName: user.username,
    }, process.env.SECRET, { expiresIn: "24h" })
    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    })
    return res.status(200).send({
        status: 1,
        message: "Login_SUCCESS",
        data: {
            id: user._id,
            userName: user.username,
            email: user.email
        }
    })


}

export const nodeMailer = async (req, res) => {
    try {
        // Nodemailer transporter
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.email,
                pass: process.env.password,
            },
        });

        const emailFormat = /^[a-zA-Z0-9_.+]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
        let email = req.body.email?.toLowerCase();

        if (!email || !email.match(emailFormat)) {
            return res.status(400).json({
                status: 0,
                message: "Email is Incorrect",
            });
        }

        // Check if user exists
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({
                status: 0,
                message: "Email is not registered!",
            });
        }

        // Generate OTP
        const otp = otpGenerator.generate(6, {
            digits: true,
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
            specialChars: false,
        });

        // OTP expiration (5 minutes)
        const expiresAt = Date.now() + 10 * 60 * 1000;

        // Save OTP to user
        await User.updateOne(
            { email: email },
            { $set: { otp: otp, expiresAt: expiresAt } }
        );

        // Email template
        const mailOptions = {
            from: 'minigram <minigram@contact.com>',
            to: email,
            subject: 'Your OTP Code',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #333;">OTP Verification</h2>
          <p>Hello ${user.username},</p>
          <p>Your OTP for verification is: 
            <strong style="font-size: 24px; color: #ff6b6b;">${otp}</strong>
          </p>
          <p>This OTP will expire in 5 minutes.</p>
          <br>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);

        //console.log('Email sent: ' + info.response);
        res.json({
            status: 1,
            message: 'OTP generated and sent successfully',
            data: { email: email }, // ⚠️ remove in production
        });

    } catch (error) {
        console.error("Error Generating OTP: ", error);
        console.log("node mailer error", error.message);

        res.status(500).json({
            status: 0,
            message: "Internal Server Error",
        });
    }

}

export const verifyOtp = async (req, res) => {
    try {
        const emailFormat = /^[a-zA-Z0-9_.+]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
        const otpFormat = /^\d{6}$/;

        let email = req.body.email?.toLowerCase();
        let otp = req.body.otp;

        if (!email || !otp) {
            return res.status(404).json({
                status: 0,
                message: "OTP or email not found",
            });
        }
        if (!email?.match(emailFormat) || !otp?.match(otpFormat)) {
            return res.status(400).json({
                status: 0,
                message: "OTP or email format is invalid",
            });
        }

        const verify = await User.findOne({ email });

        if (!verify) {
            return res.status(404).json({
                status: 0,
                message: "User not found or OTP incorrect",
            });
        }

        // Check if OTP matches explicitly (optional since already used in query)
        if (verify.otp !== otp) {
            return res.status(400).json({
                status: 0,
                message: "Please enter the correct OTP",
            });
        }

        // Check expiry
        if (verify.expiresAt < Date.now()) {
            return res.status(400).json({
                status: 0,
                message: "OTP has expired. Please request a new OTP.",
            });
        }
        await User.updateOne({ email: email }, { $set: { isVerified: true } });

        // ✅ Success response
        return res.status(200).json({
            status: 1,
            message: "OTP_VERIFIED"
        });

    } catch (error) {
        console.error("OTP verification error:", error);
        return res.status(500).json({
            status: 0,
            message: error.message || "Internal server error",
        });
    }
};


export const resetPassword = async (req, res) => {
    const emailFormat = /^[a-zA-Z0-9_.+]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    const otpFormat = /^\d{6}$/;
    const passwordValidation = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
    const { email, otp, password } = req.body;

    if (!email.match(emailFormat) || !password.match(passwordValidation) || !otp.match(otpFormat)) {
        return res.status(404).send({
            status: 0,
            message: "Please Enter Strong Password"
        })
    }

    if (!email || !password || !otp) {
        return res.status(404).send({
            status: 0,
            message: "Please Enter Password"
        })
    }

    const verify = await User.findOne({ email: email, otp: otp });
    //console.log(verify);

    if (!verify) {
        res.status(404).json({
            status: 0,
            message: "User not found",
        });
    }
    const hashedPassword = await bcrypt.hashSync(password)
    // if (verify.expiresAt < Date.now()) {
    //             return res.status(400).json({
    //                 status: 0,
    //                 message: "Link has expired. Please request again."
    //             });
    //         }
    await User.updateOne(
        { email: email, otp: otp },
        { $set: { password: hashedPassword } }
    );

    res.status(200).send({
        status: 1,
        message: "Password updated successful"
    })

}
//         let decoded = jwt.verify(token, process.env.SECRET, (err, decoded)=>{
//             if (err) {
//   if (err.name === "TokenExpiredError") {
//     //console.log("Token expired");
//     return res.status(401).send({
//       status:0,
//       message:"Token expired"
//     })
//   } else {
//     //console.log("Invalid token");
//           return res.status(401).send({
//       status:0,
//       message:"Invalid token"
//     })
//   }
// } else {
//   //console.log("Valid token:", decoded);
// }
//         });

//           if(decoded){
//               res.clearCookie('token',{
//                   httpOnly: true,
//                   secure: true
//               })
//               return res.status(200).send({
//               status: 1,
//               message: "logout successfully"
//           })
//           }


export const authMe = async (req, res) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        status: 0,
        message: "Unauthorized",
      });
    }

    const decoded = jwt.verify(token, process.env.SECRET);
    const userId = new mongoose.Types.ObjectId(decoded._id);

    const result = await User.aggregate([
      {
        $match: { _id: userId },
      },

      // 🔹 Friends (any connection)
      {
        $lookup: {
          from: "followers",
          let: { myId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$follower", "$$myId"] },   // I follow them
                    { $eq: ["$following", "$$myId"] }   // They follow me
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
              $group: {
                _id: "$friendId"
              }
            }
          ],
          as: "friendsIds"
        }
      },

      // 🔹 Get friend profiles
      {
        $lookup: {
          from: "users",
          localField: "friendsIds._id",
          foreignField: "_id",
          as: "friends"
        }
      },

      // 🔹 Friends count
      {
        $addFields: {
          friendsCount: { $size: "$friends" }
        }
      },

      // 🔹 Final response
      {
        $project: {
          username: 1,
          email: 1,
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
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: 1,
      message: "User logged_in",
      data: result[0],
    });

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: 0,
        message: "Token expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        status: 0,
        message: "Invalid token",
      });
    }

    console.error("AuthMe Error:", error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};




export const logOut = (req, res) => {
    try {
        const token = req.cookies?.token
        if (!token) {
            return res.status(401).send({
                status: 0,
                message: 'Unauthorized'
            })
        } else {
            let decoded = jwt.verify(token, process.env.SECRET);
            if (decoded) {
                res.clearCookie('token', {
                    httpOnly: true,
                    secure: true,
                    sameSite: "none"
                })
                return res.status(200).send({
                    status: 1,
                    message: "logout successfully"
                })
            }
        }
    } catch (error) {
        return res.send({
            status: 0,
            error: error,
            message: "Something Went Wrong"
        })
    }
}