const express = require('express')
const { requireAuth } = require('../middleware/auth')
const reportsController = require('../controllers/reports.controller')

const router = express.Router()

router.use(requireAuth)

router.get('/attendance', reportsController.attendanceReport)

module.exports = router
