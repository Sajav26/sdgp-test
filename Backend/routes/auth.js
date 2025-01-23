import express from 'express';
import { login, signup, verifyPin } from '../controller/auth.js';

const router = express.Router();

router.post("/signup", signup);

router.post("/verify", verifyPin);

router.post("/login", login);

export default router;