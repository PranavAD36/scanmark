const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const facultyController = require('../controllers/faculty.controller')

const router = express.Router()

router.use(requireAuth, requireRole('faculty'))

router.get('/dashboard', facultyController.dashboard)

module.exports = router
