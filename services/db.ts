
import { Pool } from '@neondatabase/serverless';

// Helper to safely access environment variables across different environments
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}

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

// 1. Try localStorage (Manual override from UI)
// 2. Try VITE_DATABASE_URL (Standard Vite)
// 3. Try DATABASE_URL2 (User custom)
// 4. Try DATABASE_URL (Default)
const getConnectionString = () => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('ID_CLINIC_DB_URL');
        if (stored) return stored;
    }
    return getEnv('VITE_DATABASE_URL') || getEnv('DATABASE_URL2') || getEnv('DATABASE_URL');
}

const connectionString = getConnectionString();

if (!connectionString) {
    console.warn("WARNING: Database connection string is missing.");
} else {
    const masked = connectionString.replace(/:([^:@]+)@/, ':****@');
    console.log(`Database connection initialized with: ${masked}`);
}

export const pool = new Pool({ 
    connectionString: connectionString || 'postgres://placeholder:placeholder@placeholder/placeholder', // Prevent crash on empty string
    ssl: true,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000, 
});

export const isDbConfigured = !!connectionString;
