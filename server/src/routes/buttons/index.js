import { Router } from 'express'
import { pool } from '../../db.js'
import { generateSelectAllSql } from '../../schema/helpers.js'
import { tableName, columns } from '../../schema/buttons/index.js'

const router = Router()
const selectAllSql = generateSelectAllSql(tableName, columns)

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(selectAllSql)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch buttons' })
  }
})

export default router
