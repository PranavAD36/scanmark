const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const studentController = require('../controllers/student.controller')

const router = express.Router()

router.use(requireAuth, requireRole('student'))

router.get('/dashboard', studentController.dashboard)

module.exports = router
