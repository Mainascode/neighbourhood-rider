/**
 * POST /api/riders/register
 */
export default async function register(req, res) {
  try {
    const existing = await Rider.findOne({ user: req.user._id });
    if (existing) {
      return res.status(400).json({ message: "Already registered as rider" });
    }

    const { name, phone, location, idNumber, idPicture, riderPicture } = req.body;

    // TODO: Add proper validation here

    const rider = await Rider.create({
      userId: req.user._id, // Note: Model uses userId, not user
      name,
      phone,
      idNumber,
      idPicture,
      riderPicture,
      location: location ? { type: "Point", coordinates: location } : undefined,
      isAvailable: false, // Default to unavailable until approved? Or available but not shown? Model default is true. Let's stick to default or explicit.
      status: "pending",
    });

    res.json(rider);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Rider registration failed" });
  }
}
