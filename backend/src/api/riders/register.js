/**
 * POST /api/riders/register
 */
export default async function riderRegister(req, res) {
  try {
    const existing = await Rider.findOne({ userId: req.user.id });
    if (existing) {
      return res.status(400).json({ error: "Already registered as rider" });
    }

    const { phone, idNumber, vehicleType, plateNumber } = req.body;

    // TODO: Add proper validation here

    const rider = await Rider.create({
      userId: req.user.id,
      phone,
      idNumber,
      vehicleType,
      plateNumber,
      status: "pending",
    });

    res.json(rider);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Rider registration failed" });
  }
}
