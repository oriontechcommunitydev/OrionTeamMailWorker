import express from 'express'
import cors from 'cors'
import { composeSendRouter } from './routes/composeSend'

const app = express()

app.use(cors({ origin: true, credentials: false }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true })
})

app.use('/api', composeSendRouter)

const port = Number(process.env.PORT ?? 5173)
app.listen(port, () => {
  console.log(`[compose-backend] listening on :${port}`)
})

