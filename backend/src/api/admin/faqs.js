import express from "express";
import FAQ from "../../models/FAQ.js";
import requireAuth from "../../middleware/requireAuth.js";
import requireAdmin from "../../middleware/requireAdmin.js";
import { ok, fail } from "../../lib/response.js";

const router = express.Router();

// Public: Get all PUBLISHED FAQs
router.get("/", async (req, res) => {
    try {
        const faqs = await FAQ.find({ isPublished: true }).sort({ createdAt: -1 });
        return ok(res, faqs);
    } catch (err) {
        return fail(res, "Failed to fetch FAQs", 500);
    }
});

// Admin: Get ALL FAQs (Published & Unpublished)
router.get("/all", requireAuth, requireAdmin, async (req, res) => {
    try {
        const faqs = await FAQ.find().sort({ createdAt: -1 });
        return ok(res, faqs);
    } catch (err) {
        return fail(res, "Failed to fetch FAQs", 500);
    }
});

// Admin: Create FAQ
router.post("/", requireAuth, requireAdmin, async (req, res) => {
    try {
        const { question, answer, category, isPublished } = req.body;
        const faq = await FAQ.create({ question, answer, category, isPublished });
        return ok(res, faq, 201);
    } catch (err) {
        return fail(res, "Failed to create FAQ", 500);
    }
});

// Admin: Update FAQ
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        const { question, answer, category, isPublished } = req.body;
        const faq = await FAQ.findByIdAndUpdate(
            req.params.id,
            { question, answer, category, isPublished },
            { new: true }
        );
        return ok(res, faq);
    } catch (err) {
        return fail(res, "Failed to update FAQ", 500);
    }
});

// Admin: Delete FAQ
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        await FAQ.findByIdAndDelete(req.params.id);
        return ok(res, { message: "FAQ deleted" });
    } catch (err) {
        return fail(res, "Failed to delete FAQ", 500);
    }
});

export default router;
