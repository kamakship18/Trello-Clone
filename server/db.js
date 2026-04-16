const { Pool } = require('pg');
const parseConnectionString = require('pg-connection-string');

require('dotenv').config();

const connectionString = (process.env.DATABASE_URL || '').trim();
if (!connectionString) {
  console.error('DATABASE_URL is missing or empty. Set it in server/.env (see server/.env.example).');
  process.exit(1);
}

try {
  parseConnectionString(connectionString);
} catch {
  console.error(
    'DATABASE_URL is not a valid Postgres connection string.\n' +
      '• Remove surrounding quotes if you pasted the whole URL inside "…".\n' +
      '• Use one line only (no line breaks).\n' +
      '• If the password has @ : / ? # % or spaces, it must be URL-encoded (e.g. @ → %40).\n' +
      '  Prefer copying the URI from Supabase with the password field filled in so it encodes for you.'
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL (Supabase)');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
