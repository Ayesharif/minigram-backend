import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies.token; 

    if (!token) {
      return res.status(401).json({status:0, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.SECRET);

    // Attach user info to request so you can use it later
    req.user = decoded;
//console.log(token);

    next();
  } catch (error) {
    return res.status(403).json({
      status:0,
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};