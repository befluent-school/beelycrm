import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

// Lazily create the client so the app can run in demo mode without a DB.
const client = connectionString ? postgres(connectionString, { prepare: false }) : null;

export const db = client ? drizzle(client, { schema }) : null;
export { schema };
