import mongoose from "mongoose";

// Cache the connection across hot reloads in development
let cached = global._mongooseCache;

if (!cached) {
    cached = global._mongooseCache = { conn: null, promise: null };
}

const connectDb = async () => {
    // Return existing connection if available
    if (cached.conn) {
        return cached.conn;
    }

    // Reuse in-flight connection promise
    if (!cached.promise) {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error("MONGODB_URI environment variable is not defined");
        }

        cached.promise = mongoose
            .connect(uri)
            .then((mongooseInstance) => {
                console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
                return mongooseInstance;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        // Reset promise so the next call retries
        cached.promise = null;
        throw error;
    }

    return cached.conn;
};

export default connectDb;
