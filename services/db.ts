
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

// Priority: VITE_DATABASE_URL (Standard Vite) -> DATABASE_URL2 (User custom) -> DATABASE_URL (Default)
const connectionString = getEnv('VITE_DATABASE_URL') || getEnv('DATABASE_URL2') || getEnv('DATABASE_URL');

// Check if connection string is valid
if (!connectionString) {
    console.warn("WARNING: Database connection string is missing. Please set VITE_DATABASE_URL or DATABASE_URL2.");
} else {
    // Mask the password for logging safety
    const maskedString = connectionString.replace(/:([^:@]+)@/, ':****@');
    console.log(`Database connection initialized with: ${maskedString}`);
}

// Initialize pool with connection string.
// Note: Neon requires SSL.
export const pool = new Pool({ 
    connectionString: connectionString || '',
    ssl: true, // Strict SSL for Neon
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, 
});
