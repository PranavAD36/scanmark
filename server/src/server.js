const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const { loadEnv } = require('./config/env')

const authRoutes = require('./routes/auth.routes')
const adminRoutes = require('./routes/admin.routes')
const facultyRoutes = require('./routes/faculty.routes')
const studentRoutes = require('./routes/student.routes')
const subjectRoutes = require('./routes/subjects.routes')
const sessionRoutes = require('./routes/sessions.routes')
const attendanceRoutes = require('./routes/attendance.routes')
const timetableRoutes = require('./routes/timetable.routes')

const { notFound } = require('./middleware/notFound')
const { errorHandler } = require('./middleware/errorHandler')

function createServer() {
  loadEnv()

  const app = express()
  app.use(express.json({ limit: '1mb' }))

  const defaultAllowedOrigins = [
    'http://localhost:5173',
    'https://scanmark-sage.vercel.app',
  ]

  const envAllowedOrigins = String(process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const allowedOrigins = new Set([...defaultAllowedOrigins, ...envAllowedOrigins])

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow same-origin/non-browser requests (curl, server-to-server, health checks)
      if (!origin) return callback(null, true)

      if (allowedOrigins.has(origin)) return callback(null, true)

      const err = new Error('Not allowed by CORS')
      err.status = 403
      return callback(err)
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 204,
  }

  app.use(cors(corsOptions))
  // Ensure preflight requests succeed across all routes
  app.options(/.*/, cors(corsOptions))

  app.use(morgan('dev'))

  app.get('/health', (_req, res) => res.json({ ok: true }))

  // Auth routes: keep /api prefix, plus a compatibility alias for /auth
  app.use('/api/auth', authRoutes)
  app.use('/auth', authRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/faculty', facultyRoutes)
  app.use('/api/student', studentRoutes)
  app.use('/api/subjects', subjectRoutes)
  app.use('/api/sessions', sessionRoutes)
  app.use('/api/attendance', attendanceRoutes)
  app.use('/api/timetable', timetableRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return { app }
}

module.exports = { createServer }
