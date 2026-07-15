const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const sessionsController = require('../controllers/sessions.controller')

const router = express.Router()

router.use(requireAuth)

router.post('/start', requireRole('faculty'), sessionsController.start)
router.post('/:id/end', requireRole('faculty'), sessionsController.end)
router.get('/active', requireRole('faculty'), sessionsController.active)
router.get('/results', requireRole('faculty'), sessionsController.results)

module.exports = router
