import { pool } from './db';

async function setup() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.lab_records (
        id VARCHAR(50) PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        cd4 TEXT,
        cd4_percent TEXT,
        viral_load TEXT,
        dr_resistance_profile TEXT,
        cbc TEXT,
        fbs VARCHAR(255),
        cr VARCHAR(255),
        alt VARCHAR(255),
        chol VARCHAR(255),
        tg VARCHAR(255),
        hdl VARCHAR(255),
        ldl VARCHAR(255),
        hbsag VARCHAR(255),
        anti_hbs VARCHAR(255),
        anti_hcv VARCHAR(255),
        cxr TEXT,
        vdrl VARCHAR(255),
        tpha VARCHAR(255),
        tst VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("lab_records table created successfully.");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    client.release();
    pool.end();
  }
}

setup();
