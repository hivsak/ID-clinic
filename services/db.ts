
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

// Check if connection string is valid
if (!connectionString) {
    console.warn("WARNING: Database connection string (DATABASE_URL2) is missing. Database features will fail.");
} else {
    // Mask the password for logging safety
    const maskedString = connectionString.replace(/:([^:@]+)@/, ':****@');
    console.log(`Database connection initialized with: ${maskedString}`);
}

// Initialize pool with connection string.
// Note: Neon requires SSL, so we explicitly set it, although the connection string usually handles it.
export const pool = new Pool({ 
    connectionString: connectionString || '',
    ssl: true, // Enforce SSL for Neon
    max: 20,   // Max clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Fail relatively fast if connection is stuck
});
