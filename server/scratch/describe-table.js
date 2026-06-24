require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Profile';
    `);
    console.log('Profile table columns in DB:', res.rows);
  } catch (err) {
    console.error('Error describing Gift table:', err);
  } finally {
    await client.end();
  }
}

main();
