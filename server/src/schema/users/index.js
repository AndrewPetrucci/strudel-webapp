import {
  generateCreateTableSql,
  getPrimaryKey,
  getForeignKeys,
  getUniqueConstraints,
} from '../helpers.js'

export const tableName = 'users'

export const columns = {
  id: {
    name: 'id',
    order: 0,
    type: 'SERIAL',
    isNull: false,
    isPrimaryKey: true,
    isDefault: true,
  },
  email: {
    name: 'email',
    order: 1,
    type: 'VARCHAR(255)',
    isNull: false,
    isUnique: true,
  },
  password_hash: {
    name: 'password_hash',
    order: 2,
    type: 'VARCHAR(255)',
    isNull: true,
  },
  username: {
    name: 'username',
    order: 3,
    type: 'VARCHAR(50)',
    isNull: true,
    isUnique: true,
  },
  email_verified_at: {
    name: 'email_verified_at',
    order: 4,
    type: 'TIMESTAMPTZ',
    isNull: true,
  },
  created_at: {
    name: 'created_at',
    order: 5,
    type: 'TIMESTAMPTZ',
    isNull: true,
    isDefault: true,
    defaultExpr: 'NOW()',
  },
}

export const primaryKey = getPrimaryKey(columns)
export const foreignKeys = getForeignKeys(columns)
export const uniqueConstraints = getUniqueConstraints(columns)
export const createTableSql = generateCreateTableSql(tableName, columns)
