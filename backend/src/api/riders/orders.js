/**
 * POST /api/riders/accept-order
 * Body: { orderId }
 */
export async function acceptOrder(req, res) {
    return res.status(200).json({
        success: true,
        message: "Rider system disabled in single-admin mode",
    });
}

/**
 * POST /api/riders/reject-order
 * Body: { orderId }
 */
export async function rejectOrder(req, res) {
    return res.status(200).json({
        success: true,
        message: "Rider system disabled in single-admin mode",
    });
}
