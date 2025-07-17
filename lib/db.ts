import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/explorerDB';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface CachedConnection {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

let cached = (global as Record<string, unknown>).mongoose as CachedConnection | undefined;
if (!cached) {
  cached = (global as Record<string, unknown>).mongoose = { conn: null, promise: null };
}

// 軽量化されたMongoDB接続オプション
const getOptimizedOptions = () => {
  const isLowMemory = process.env.NODE_OPTIONS?.includes('256') || process.env.LOW_MEMORY === 'true';
  
  return {
    bufferCommands: false,
    maxPoolSize: isLowMemory ? 5 : 8, // 10→8、軽量時は5
    serverSelectionTimeoutMS: isLowMemory ? 3000 : 5000,
    socketTimeoutMS: isLowMemory ? 30000 : 45000,
    family: 4, // Use IPv4
    connectTimeoutMS: isLowMemory ? 5000 : 10000,
    // 軽量化: 不要な機能を無効化
    autoIndex: false,
    autoCreate: false,
  };
};

async function dbConnect() {
  // Ensure cached is defined
  if (!cached) {
    cached = { conn: null, promise: null };
  }

  // Check if mongoose is already connected (existing Express app connection)
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    return mongoose.connection;
  }

  // If there's a connection attempt in progress, wait for it
  if (cached.promise) {
    const conn = await cached.promise;
    return conn;
  }

  // If we have a cached connection, use it
  if (cached.conn) {
    return cached.conn;
  }

  try {
    // Only create new connection if absolutely necessary
    if (mongoose.connection.readyState === mongoose.ConnectionStates.disconnected) {
      const opts = getOptimizedOptions();
      cached.promise = (mongoose.connect(MONGODB_URI, opts) as unknown) as Promise<mongoose.Connection>;
      cached.conn = await cached.promise;
    } else {
      // Use existing connection
      cached.conn = mongoose.connection;
    }

    return cached.conn;
  } catch (error) {
    // If connection fails, try to use existing connection if available
    if ((mongoose.connection.readyState as number) === mongoose.ConnectionStates.connected) {
      return mongoose.connection;
    }

    cached.promise = null;
    throw error;
  }
}

// 軽量化: 接続プールのクリーンアップ
export async function dbDisconnect() {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected) {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  }
}

// Export both as default and named export for compatibility
export default dbConnect;
export const connectToDatabase = dbConnect;
