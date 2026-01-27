
import express from 'express';
import { initiateSTKPush, handleMpesaCallback } from './mpesaController.js';

const router = express.Router();

router.post('/mpesa/pay', initiateSTKPush);
router.post('/mpesa/callback', handleMpesaCallback);

export default router;
