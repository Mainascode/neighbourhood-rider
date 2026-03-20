export default async function me(req, res) {
    return res.status(200).json({
        success: true,
        rider: null,
        status: "disabled",
        message: "Rider system disabled in single-admin mode",
    });
}
