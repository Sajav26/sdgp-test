import express from 'express';
import { donateFood, buyFood } from '../controller/enduser.js';

const router = express.Router();

router.post('/food/donate', donateFood);

router.post('/food/buy', buyFood);

export default router;