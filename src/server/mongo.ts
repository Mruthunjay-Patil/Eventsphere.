import 'dotenv/config';
import { MongoClient, Collection } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'eventsphere';

let client: MongoClient | null = null;
let db: ReturnType<MongoClient['db']> | null = null;

export async function connectMongo() {
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Add your MongoDB connection string to .env before starting EventSphere.');
  }
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  await db.command({ ping: 1 });
  console.log(`MongoDB connected: ${dbName}`);
  return db;
}

export function collection<T extends Record<string, any>>(name: string): Collection<T> {
  if (!db) throw new Error('MongoDB is not connected');
  return db.collection<T>(name);
}

export async function closeMongo() {
  if (client) await client.close();
  client = null;
  db = null;
}

export async function seedCollection<T extends Record<string, any>>(name: string, seed: T[]) {
  const col = collection<T>(name);
  const count = await col.countDocuments();
  if (count === 0 && seed.length) {
    await col.insertMany(seed as any);
    return seed;
  }
  return await col.find({}).toArray();
}

export async function replaceAll<T extends Record<string, any>>(name: string, docs: T[]) {
  const col = collection<T>(name);
  await col.deleteMany({});
  if (docs.length) await col.insertMany(docs as any);
}
