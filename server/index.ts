import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { composeSendRouter } from './routes/composeSend'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = Number(process.env.PORT ?? 3000)

// ── Middleware ──────────────────────────────────
app.use(cors({ origin: true, credentials: false }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Health check ────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true })
})

// ── API Routes ──────────────────────────────────
app.use('/api', composeSendRouter)


// ── Frontend Static Files ───────────────────────
// Vite build çıktısını serve et
const distPath = path.join(__dirname, '../dist')
app.use(express.static(distPath))

// SPA fallback — tüm bilinmeyen route'lar index.html'e
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

// ── Listen ──────────────────────────────────────
app.listen(port, '0.0.0.0', () => {
  console.log(`[server] http://localhost:${port}`)
})


