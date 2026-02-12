
import express from 'express';
import { initiateSTKPush, handleMpesaCallback } from './mpesaController.js';
import requireAuth from "../../middleware/requireAuth.js";

const router = express.Router();

router.post('/mpesa/pay', requireAuth, initiateSTKPush);
router.post('/mpesa/callback', express.raw({ type: 'application/json' }), handleMpesaCallback);

// Admin triggering payouts manually or via cron
import { processBatchPayouts } from './payouts.js';
router.post('/payouts/process', processBatchPayouts);

export default router;
