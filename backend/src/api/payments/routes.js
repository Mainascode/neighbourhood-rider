
import express from 'express';
import { initiateSTKPush, handleMpesaCallback } from './mpesaController.js';
import requireAuth from "../../middleware/requireAuth.js";
import requireAdmin from "../../middleware/requireAdmin.js";
import { createRateLimiter } from "../../middleware/rateLimiter.js";
import { validateStkPushPayload } from "../../middleware/validators.js";
import { auditAdminAction } from "../../middleware/adminAuditLogger.js";

const router = express.Router();
const paymentRateLimit = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: "Too many payment requests. Please try again later.",
});

router.post('/mpesa/pay', requireAuth, paymentRateLimit, validateStkPushPayload, initiateSTKPush);
router.post('/mpesa/callback', express.raw({ type: 'application/json' }), handleMpesaCallback);

// Admin triggering payouts manually or via cron
import { processBatchPayouts } from './payouts.js';
router.post('/payouts/process', requireAuth, requireAdmin, auditAdminAction("PAYOUTS_PROCESS"), processBatchPayouts);

export default router;
