const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const attendanceController = require('../controllers/attendance.controller')

const router = express.Router()

router.use(requireAuth)

router.post('/scan', requireRole('student'), attendanceController.scan)
router.post('/manual', requireRole('faculty'), attendanceController.manual)
router.get('/records', requireRole('student'), attendanceController.records)
router.get('/summary', requireRole('student'), attendanceController.summary)

module.exports = router
