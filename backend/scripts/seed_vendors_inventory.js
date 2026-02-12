import mongoose from "mongoose";
import dotenv from "dotenv";
import Vendor from "../src/models/Vendor.js";

dotenv.config();

const sampleInventory = [
  { name: "Milk 500ml", price: 70 },
  { name: "Bread", price: 60 },
  { name: "Eggs 6 pack", price: 90 },
  { name: "Rice 1kg", price: 160 },
  { name: "Sugar 1kg", price: 140 },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const vendors = await Vendor.find({ status: "approved" });
  for (const vendor of vendors) {
    if (!vendor.inventory || vendor.inventory.length === 0) {
      vendor.inventory = sampleInventory;
      await vendor.save();
    }
  }

  console.log(`Seeded inventory for ${vendors.length} vendors.`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
