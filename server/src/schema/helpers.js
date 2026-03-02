/**
 * Column names sorted by each column's order property (default 0).
 * @param {Record<string, { order?: number }>} columns
 * @returns {string[]}
 */
export function getOrderedColumnNames(columns) {
  return Object.entries(columns)
    .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
    .map(([name]) => name)
}

/**
 * Primary key column(s) from columns where isPrimaryKey is true.
 * @param {Record<string, { order?: number; isPrimaryKey?: boolean }>} columns
 * @returns {string | string[]}
 */
export function getPrimaryKey(columns) {
  const order = getOrderedColumnNames(columns)
  const names = Object.entries(columns)
    .filter(([, c]) => c.isPrimaryKey)
    .map(([name]) => name)
  names.sort((a, b) => order.indexOf(a) - order.indexOf(b))
  return names.length === 1 ? names[0] : names
}

/**
 * Foreign keys from columns that have a references property.
 * @param {Record<string, { references?: { table: string; column?: string } }>} columns
 * @returns {{ column: string; references: { table: string; column?: string } }[]}
 */
export function getForeignKeys(columns) {
  return Object.entries(columns)
    .filter(([, c]) => c.references)
    .map(([column, { references }]) => ({ column, references }))
}

/**
 * Unique constraints from columns (isUnique or uniqueGroup).
 * @param {Record<string, { isUnique?: boolean; uniqueGroup?: string; order?: number }>} columns
 * @returns {string[][]}
 */
export function getUniqueConstraints(columns) {
  const result = []
  const byGroup = /** @type {Record<string, string[]>} */ ({})
  const order = getOrderedColumnNames(columns)
  for (const [name, col] of Object.entries(columns)) {
    if (col.isUnique) result.push([name])
    if (col.uniqueGroup) {
      (byGroup[col.uniqueGroup] ??= []).push(name)
    }
  }
  for (const names of Object.values(byGroup)) {
    if (names.length > 0) {
      names.sort((a, b) => order.indexOf(a) - order.indexOf(b))
      result.push(names)
    }
  }
  return result
}

/**
 * Build CREATE TABLE IF NOT EXISTS from table name and columns.
 * @param {string} tableName
 * @param {Record<string, { name: string; type: string; isNull?: boolean; isPrimaryKey?: boolean; isUnique?: boolean; isDefault?: boolean; defaultExpr?: string }>} columns
 * @returns {string}
 */
export function generateCreateTableSql(tableName, columns) {
  const order = getOrderedColumnNames(columns)
  const defs = order
    .map((name) => {
      const col = columns[name]
      if (!col) return null
      const parts = [`${col.name} ${col.type}`]
      if (col.isNull === false) parts.push('NOT NULL')
      if (col.isPrimaryKey) parts.push('PRIMARY KEY')
      if (col.isUnique) parts.push('UNIQUE')
      if (col.isDefault && col.defaultExpr) parts.push(`DEFAULT ${col.defaultExpr}`)
      return parts.join(' ')
    })
    .filter(Boolean)
  return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${defs.join(',\n  ')}\n)`
}

/**
 * Column names that are insertable (not SERIAL PK, not server-only default).
 * @param {Record<string, { isPrimaryKey?: boolean; type?: string; isDefault?: boolean; defaultExpr?: string; order?: number }>} columns
 * @returns {string[]}
 */
export function getInsertableColumnNames(columns) {
  const order = getOrderedColumnNames(columns)
  return order.filter((name) => {
    const col = columns[name]
    if (!col) return false
    const isSerialPk = col.isPrimaryKey && (col.type === 'SERIAL' || col.type === 'BIGSERIAL')
    const isServerDefault = col.isDefault && col.defaultExpr
    return !isSerialPk && !isServerDefault
  })
}

/**
 * SELECT all columns FROM table. If orderBy is given, add ORDER BY; otherwise preserve table order.
 * @param {string} tableName
 * @param {Record<string, { order?: number }>} columns
 * @param {string} [orderBy]
 * @returns {string}
 */
export function generateSelectAllSql(tableName, columns, orderBy) {
  const names = getOrderedColumnNames(columns)
  const selectList = names.join(', ')
  if (orderBy) {
    return `SELECT ${selectList} FROM ${tableName} ORDER BY ${orderBy}`
  }
  return `SELECT ${selectList} FROM ${tableName}`
}
