import mongoose from 'mongoose';
import { env } from './env';

export async function connectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 1) return; // already connected
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    dbName: 'satyavak',
  });
}
