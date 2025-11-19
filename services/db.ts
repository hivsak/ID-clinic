
import { Pool } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL2;

if (!connectionString) {
  console.error("DATABASE_URL2 is not defined. Please check your environment variables.");
}

export const pool = new Pool({ connectionString });
