/**
 * POST /api/riders/register
 */
export default async function riderRegister(req, res) {
  return res.status(200).json({
    success: true,
    status: "disabled",
    message: "Rider system disabled in single-admin mode",
  });
}
