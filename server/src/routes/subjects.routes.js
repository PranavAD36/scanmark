const express = require('express')
const { requireAuth } = require('../middleware/auth')
const subjectsController = require('../controllers/subjects.controller')

const router = express.Router()

router.use(requireAuth)

router.get('/', subjectsController.list)
router.post('/', subjectsController.create)
router.delete('/:id', subjectsController.remove)

module.exports = router
