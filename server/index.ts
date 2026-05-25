import express from 'express'
import cors from 'cors'

import { recipientsRouter } from './routes/recipients'
import { composeSendRouter } from './routes/composeSend'
import { composeHistoryRouter } from './routes/composeHistory'


const app = express()

app.use(cors({ origin: true, credentials: false }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true })
})

app.use('/api/recipients', recipientsRouter)
app.use('/api/compose/send', composeSendRouter)
app.use('/api/compose/history', composeHistoryRouter)


const port = Number(process.env.PORT ?? 5173)
app.listen(port, () => {
  console.log(`[compose-backend] listening on :${port}`)
})

