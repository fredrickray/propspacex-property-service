import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import DotenvConfig from './dotenv.config';
let mongoServer: MongoMemoryServer;

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    console.log('Already connected to MongoDB. Disconnecting first...');
    await mongoose.disconnect();
  }
  // Check if not connected
  try {
    if (process.env.NODE_ENV === 'test') {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log(`Connected to in-memory MongoDB for testing`);
    } else {
      // Use normal MongoDB URL for dev/prod
      const dbUrl = DotenvConfig.Database.url as string;
      await mongoose.connect(dbUrl);
      console.log(`Connected to MongoDB Successfully`);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
  if (mongoServer) {
    await mongoServer.stop();
    console.log('Stopped in-memory MongoDB');
  }
};

export const clearDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({}); // Clear data from all collections
    }
    console.log('Test database cleared');
  }
};
