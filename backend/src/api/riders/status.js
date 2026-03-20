/**
 * POST /api/riders/go-online
 * Body: { location: { lat, lng } }
 */
export async function goOnline(req, res) {
    return res.status(200).json({
        success: true,
        rider: null,
        status: "disabled",
        message: "Rider system disabled in single-admin mode",
    });
}

/**
 * POST /api/riders/go-offline
 * Body: { reason }
 */
export async function goOffline(req, res) {
    return res.status(200).json({
        success: true,
        rider: null,
        status: "disabled",
        message: "Rider system disabled in single-admin mode",
    });
}

/**
 * POST /api/riders/heartbeat
 * Body: { location: { lat, lng } }
 */
export async function heartbeat(req, res) {
    return res.status(200).json({
        success: true,
        status: "disabled",
        message: "Rider system disabled in single-admin mode",
    });
}
