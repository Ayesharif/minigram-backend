import express from 'express'


import { authMe, login, logOut, nodeMailer, register, resetPassword, verifyOtp } from '../controller/AuthController.js';


const router = express.Router();

router.post('/register', register);

router.post('/login', login)
router.get('/authMe', authMe)
router.post('/logout', logOut)


router.post('/forgotpassword', nodeMailer)

router.post('/verifyotp', verifyOtp)

router.post('/resetpassword',resetPassword)

router.post('/sendemail', nodeMailer );


export default router;