import { Router } from 'express'
import { pool } from '../../db.js'
import { generateSelectAllSql } from '../../schema/helpers.js'
import { tableName, columns } from '../../schema/songs/index.js'
import { optionalAuth, requireAuth } from '../../middleware/auth.js'

const router = Router()
const selectAllSql = generateSelectAllSql(tableName, columns)

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(selectAllSql)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch songs' })
  }
})

router.post('/', optionalAuth, requireAuth, async (req, res) => {
  try {
    const { name, version, code } = req.body
    if (!(name && (name || '').trim())) {
      return res.status(400).json({ error: 'name is required' })
    }
    const userId = req.user.id
    const author = req.user.username || req.user.email
    const { rows } = await pool.query(
      `INSERT INTO ${tableName} (name, author, version, code, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [(name || '').trim(), author, (version || '').trim(), (code || '').trim(), userId]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create song' })
  }
})

router.put('/:id', optionalAuth, requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid song id' })
    const { name, version, code } = req.body
    const { rows: existing } = await pool.query(`SELECT user_id FROM ${tableName} WHERE id = $1`, [id])
    if (existing.length === 0) return res.status(404).json({ error: 'Song not found' })
    const songUserId = existing[0].user_id
    if (songUserId != null && songUserId !== req.user.id) {
      return res.status(403).json({ error: 'Only the creator can edit this song' })
    }
    const { rows } = await pool.query(
      `UPDATE ${tableName} SET name = $1, version = $2, code = $3 WHERE id = $4 RETURNING *`,
      [(name || '').trim(), (version || '').trim(), (code || '').trim(), id]
    )
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update song' })
  }
})

export default router
