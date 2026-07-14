const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('A variável DATABASE_URL não foi configurada.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

pool.on('error', (error) => {
  console.error('Erro inesperado no PostgreSQL:', error);
});

async function query(text, params = []) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query
};
