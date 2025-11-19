
import { Pool } from '@neondatabase/serverless';

// Helper to safely access environment variables
const getEnv = (key: string) => {
  try {
    // Check if process and process.env exist (node/bundler environment)
    return typeof process !== 'undefined' && process.env ? process.env[key] : undefined;
  } catch {
    return undefined;
  }
};

// Try to get DATABASE_URL2 first, then fallback to DATABASE_URL
const connectionString = getEnv('DATABASE_URL2') || getEnv('DATABASE_URL');

if (!connectionString) {
  console.error("Database connection string is missing. Please check your environment variables for DATABASE_URL2 or DATABASE_URL.");
}

// Initialize pool with connection string (or empty string to prevent immediate crash, query will fail later)
export const pool = new Pool({ connectionString: connectionString || '' });
