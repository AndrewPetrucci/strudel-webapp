import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { ensureDatabase, ensureSchema } from './db.js'
import buttonsRouter from './routes/buttons/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/buttons', buttonsRouter)

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' })
})

const clientOut = path.join(__dirname, '../../client/out')
const staticDir = existsSync(clientOut) ? clientOut : null
if (staticDir) {
  app.use(express.static(staticDir))
  app.get('*', (req, res) => {
    const subpath = req.path.replace(/^\//, '').split('?')[0] || ''
    const htmlFile = subpath === '' ? 'index.html' : subpath + '.html'
    const file = path.join(staticDir, htmlFile)
    const fallback = path.join(staticDir, 'index.html')
    res.sendFile(existsSync(file) ? file : fallback)
  })
}

ensureDatabase()
  .then(() => ensureSchema())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to ensure database:', err.message)
    process.exit(1)
  })
