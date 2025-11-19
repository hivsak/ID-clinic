
import { Pool } from '@neondatabase/serverless';

// Helper to safely access environment variables across different environments (Vite, Node, Browser)
const getEnv = (key: string) => {
  // 1. Try import.meta.env (Vite standard)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  // 2. Try process.env (Node.js / Webpack / Some build tools)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}

  // 3. Try direct window access (Runtime injection)
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && window[key]) {
       // @ts-ignore
      return window[key];
    }
    // @ts-ignore
    if (typeof window !== 'undefined' && window.env && window.env[key]) {
       // @ts-ignore
      return window.env[key];
    }
  } catch (e) {}

  return undefined;
};

// Try to get DATABASE_URL2 first, then fallback to DATABASE_URL
const connectionString = getEnv('DATABASE_URL2') || getEnv('DATABASE_URL');

if (!connectionString) {
  console.error("CRITICAL: Database connection string not found. Please ensure DATABASE_URL2 or DATABASE_URL is set in your .env file or environment.");
} else {
    // Log partially hidden string for debugging purposes
    console.log(`Database connection initialized with: ${connectionString.substring(0, 15)}...`);
}

// Initialize pool with connection string (or empty string to prevent immediate crash, though queries will fail)
export const pool = new Pool({ connectionString: connectionString || '' });
