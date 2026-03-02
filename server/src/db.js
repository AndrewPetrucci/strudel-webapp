import pg from 'pg'
import * as buttonsSchema from './schema/buttons/index.js'

const { Pool } = pg

const tableSchemas = [
  {
    createTableSql: buttonsSchema.createTableSql,
    tableName: buttonsSchema.tableName,
    seedColumns: buttonsSchema.seedColumns,
    seedRows: buttonsSchema.seedRows ?? [],
  },
]

function getConnectionString(connectToDatabase = undefined) {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL)
      if (connectToDatabase !== undefined) {
        url.pathname = '/' + (connectToDatabase || 'postgres')
      }
      return url.toString()
    } catch (_) {
      return process.env.DATABASE_URL
    }
  }
  const db = connectToDatabase ?? process.env.PG_DATABASE ?? 'strudel_webapp'
  const user = process.env.PG_USER ?? 'postgres'
  const password = process.env.PG_PASSWORD ?? ''
  const host = process.env.PG_HOST ?? 'localhost'
  const port = process.env.PG_PORT ?? '5432'
  const encoded = encodeURIComponent(password)
  return `postgresql://${user}:${encoded}@${host}:${port}/${db}`
}

export async function ensureDatabase() {
  let targetDb = process.env.PG_DATABASE ?? 'strudel_webapp'
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL)
      const dbFromUrl = (url.pathname.slice(1).split('/')[0] || '').trim() || 'postgres'
      if (dbFromUrl === 'postgres') return
      targetDb = dbFromUrl
    } catch (_) {}
  }
  const client = new pg.Client({
    connectionString: getConnectionString('postgres'),
    ...(process.env.NODE_ENV === 'production' && { ssl: { rejectUnauthorized: false } }),
  })
  try {
    await client.connect()
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb])
    if (rows.length === 0) {
      await client.query(`CREATE DATABASE "${targetDb.replace(/"/g, '""')}"`)
      console.log(`Created database: ${targetDb}`)
    }
  } finally {
    await client.end()
  }
}

export async function ensureSchema() {
  for (const { createTableSql, tableName, seedColumns, seedRows } of tableSchemas) {
    await pool.query(createTableSql)
    if (seedColumns?.length && seedRows?.length) {
      const { rows } = await pool.query(`SELECT 1 FROM ${tableName} LIMIT 1`)
      if (rows.length === 0) {
        for (const row of seedRows) {
          const placeholders = row.map((_, i) => `$${i + 1}`).join(', ')
          await pool.query(
            `INSERT INTO ${tableName} (${seedColumns.join(', ')}) VALUES (${placeholders})`,
            row
          )
        }
        console.log(`Seeded ${tableName} table`)
      }
    }
  }
}

export const pool = new Pool({
  connectionString: getConnectionString(),
  ...(process.env.NODE_ENV === 'production' && { ssl: { rejectUnauthorized: false } }),
})

pool.on('error', (err) => {
  console.error('Unexpected pool error', err)
})
