import express from "express";
import FAQ from "../../models/FAQ.js";
import requireAuth from "../../middleware/requireAuth.js";
import requireAdmin from "../../middleware/requireAdmin.js";

const router = express.Router();

// Public: Get all PUBLISHED FAQs
router.get("/", async (req, res) => {
    try {
        const faqs = await FAQ.find({ isPublished: true }).sort({ createdAt: -1 });
        res.json(faqs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch FAQs" });
    }
});

// Admin: Get ALL FAQs (Published & Unpublished)
router.get("/all", requireAuth, requireAdmin, async (req, res) => {
    try {
        const faqs = await FAQ.find().sort({ createdAt: -1 });
        res.json(faqs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch FAQs" });
    }
});

// Admin: Create FAQ
router.post("/", requireAuth, requireAdmin, async (req, res) => {
    try {
        const { question, answer, category, isPublished } = req.body;
        const faq = await FAQ.create({ question, answer, category, isPublished });
        res.status(201).json(faq);
    } catch (err) {
        res.status(500).json({ error: "Failed to create FAQ" });
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
        res.json(faq);
    } catch (err) {
        res.status(500).json({ error: "Failed to update FAQ" });
    }
});

// Admin: Delete FAQ
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        await FAQ.findByIdAndDelete(req.params.id);
        res.json({ message: "FAQ deleted" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete FAQ" });
    }
});

export default router;
