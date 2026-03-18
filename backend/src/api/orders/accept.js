export default async function handler(req, res) {
  return res.status(410).json({ error: "Use /api/riders/accept-order instead." });
}
