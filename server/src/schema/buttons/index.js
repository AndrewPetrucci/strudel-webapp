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

/** Parse CSV with quoted fields (including newlines). */
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

export const tableName = 'buttons'

export const columns = {
  id: {
    name: 'id',
    order: 0,
    type: 'VARCHAR(255)',
    isNull: false,
    isPrimaryKey: true,
  },
  name: {
    name: 'name',
    order: 1,
    type: 'VARCHAR(255)',
    isNull: false,
  },
  code: {
    name: 'code',
    order: 2,
    type: 'TEXT',
    isNull: true,
  },
  cursor_end_of_line_offset: {
    name: 'cursor_end_of_line_offset',
    order: 3,
    type: 'INTEGER',
    isNull: true,
  },
  insert_index: {
    name: 'insert_index',
    order: 4,
    type: 'INTEGER',
    isNull: true,
  },
  imports: {
    name: 'imports',
    order: 5,
    type: 'TEXT',
    isNull: true,
  },
  consts: {
    name: 'consts',
    order: 6,
    type: 'TEXT',
    isNull: true,
  },
  button_group: {
    name: 'button_group',
    order: 7,
    type: 'VARCHAR(255)',
    isNull: true,
  },
}

export const primaryKey = getPrimaryKey(columns)
export const foreignKeys = getForeignKeys(columns)
export const uniqueConstraints = getUniqueConstraints(columns)
export const createTableSql = generateCreateTableSql(tableName, columns)

export const seedColumns = [
  'id',
  'name',
  'code',
  'cursor_end_of_line_offset',
  'insert_index',
  'imports',
  'consts',
  'button_group',
]

function loadSeedRows() {
  const csvPath = path.join(__dirname, 'seed.csv')
  const csvText = readFileSync(csvPath, 'utf8')
  const parsed = parseCSV(csvText)
  // Skip rows with empty id/name so we never seed invalid buttons (e.g. from trailing newline)
  const valid = parsed.filter((row) => (row.id || '').trim() && (row.name || '').trim())
  return valid.map((row) => [
    (row.id || '').trim(),
    (row.name || '').trim(),
    row.code || '',
    row.cursorEndOfLineOffset !== undefined && row.cursorEndOfLineOffset !== '' ? parseInt(row.cursorEndOfLineOffset, 10) : 0,
    row.insertIndex !== undefined && row.insertIndex !== '' ? parseInt(row.insertIndex, 10) : 0,
    row.imports || '',
    row.consts || '',
    row.group || '', // CSV column "group" -> DB column button_group
  ])
}

export const seedRows = loadSeedRows()
