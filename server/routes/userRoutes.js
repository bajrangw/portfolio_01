import express from "express";
import { auth } from "../middleware/auth.js";
import { getPublishedCrations, getUserCrations, toggleLikeCration } from "../controllers/userController.js";

const userRouter = express.Router()

userRouter.get('/get-user-creations', auth, getUserCrations)
userRouter.get('/get-published-creations', auth, getPublishedCrations)
userRouter.post('/toggle-like-creations', auth, toggleLikeCration)

export default userRouter;