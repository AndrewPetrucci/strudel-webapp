import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import {
  generateCreateTableSql,
  getPrimaryKey,
  getForeignKeys,
  getUniqueConstraints,
} from '../helpers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function parseCSVRows(csvText) {
  const rows = []
  let row = []
  let field = ''
  let i = 0
  let inQuotes = false
  while (i < csvText.length) {
    const c = csvText[i]
    if (inQuotes) {
      if (c === '"') {
        if (csvText[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (c === '\n' || c === '\r') {
      row.push(field)
      field = ''
      if (c === '\r' && csvText[i + 1] === '\n') i++
      i++
      rows.push(row)
      row = []
      continue
    }
    field += c
    i++
  }
  row.push(field)
  rows.push(row)
  return rows
}

function parseCSV(csvText) {
  const rawRows = parseCSVRows(csvText)
  if (!rawRows.length) return []
  const header = rawRows[0].map((s) => s.trim())
  const rows = []
  for (let i = 1; i < rawRows.length; i++) {
    const values = rawRows[i]
    if (values.every((v) => !(v != null && v.trim))) continue
    const row = {}
    header.forEach((h, j) => {
      row[h] = values[j] != null ? values[j].trim() : ''
    })
    rows.push(row)
  }
  return rows
}

export const tableName = 'songs'

export const columns = {
  id: {
    name: 'id',
    order: 0,
    type: 'SERIAL',
    isNull: false,
    isPrimaryKey: true,
    isDefault: true,
  },
  name: {
    name: 'name',
    order: 1,
    type: 'VARCHAR(255)',
    isNull: false,
  },
  author: {
    name: 'author',
    order: 2,
    type: 'VARCHAR(255)',
    isNull: true,
  },
  version: {
    name: 'version',
    order: 3,
    type: 'VARCHAR(255)',
    isNull: true,
  },
  code: {
    name: 'code',
    order: 4,
    type: 'TEXT',
    isNull: true,
  },
  user_id: {
    name: 'user_id',
    order: 5,
    type: 'INTEGER',
    isNull: true,
    references: { table: 'users', column: 'id' },
  },
}

export const primaryKey = getPrimaryKey(columns)
export const foreignKeys = getForeignKeys(columns)
export const uniqueConstraints = getUniqueConstraints(columns)
export const createTableSql = generateCreateTableSql(tableName, columns)

export const seedColumns = ['name', 'author', 'version', 'code']

function loadSeedRows() {
  const csvPath = path.join(__dirname, 'seed.csv')
  const csvText = readFileSync(csvPath, 'utf8')
  const parsed = parseCSV(csvText)
  const valid = parsed.filter((row) => (row.name || '').trim())
  return valid.map((row) => [
    (row.name || '').trim(),
    (row.author || '').trim(),
    (row.version || '').trim(),
    (row.code || '').trim(),
  ])
}

export const seedRows = loadSeedRows()
