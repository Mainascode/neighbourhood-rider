import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGO_URI or MONGODB_URI environment variable is not defined");
    }

    // Verify URI format (basic check)
    if (!uri.startsWith("mongodb")) {
      console.error("Invalid URI format. Must start with mongodb:// or mongodb+srv://");
    }

    // Mask password for logging
    const maskedUri = uri.replace(/:([^:@]+)@/, ":****@");
    console.log(`Attempting to connect with URI: ${maskedUri}`);

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    if (error.reason) console.error("Error reason:", error.reason);
    process.exit(1);
  }
};


export default connectDB;
export { connectDB };