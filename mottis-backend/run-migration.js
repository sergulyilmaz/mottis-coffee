require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    await pool.query('ALTER TABLE staff ALTER COLUMN email DROP NOT NULL');
    console.log('Migration basarili: staff.email artik nullable.');
  } catch (err) {
    if (err.message.includes('does not exist')) {
      console.log('staff tablosu henuz olusturulmamis, schema.sql ile olusturulacak.');
    } else {
      console.error('Migration hatasi:', err.message);
    }
  } finally {
    await pool.end();
  }
}

migrate();
