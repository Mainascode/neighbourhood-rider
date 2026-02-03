
import express from 'express';
import { initiateSTKPush, handleMpesaCallback } from './mpesaController.js';

const router = express.Router();

router.post('/mpesa/pay', initiateSTKPush);
router.post('/mpesa/callback', handleMpesaCallback);

// Admin triggering payouts manually or via cron
import { processBatchPayouts } from './payouts.js';
router.post('/payouts/process', processBatchPayouts);

export default router;
