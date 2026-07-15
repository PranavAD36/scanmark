const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const timetableController = require('../controllers/timetable.controller')

const router = express.Router()

router.use(requireAuth)

router.get('/', requireRole('student'), timetableController.listForStudent)
router.post('/', requireRole('admin'), timetableController.upsertItem)

module.exports = router
