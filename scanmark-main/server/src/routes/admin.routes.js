const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const adminController = require('../controllers/admin.controller')

const router = express.Router()

router.use(requireAuth, requireRole('admin'))

router.get('/stats', adminController.stats)
router.get('/students', adminController.listStudents)
router.post('/students', adminController.createStudent)
router.get('/faculty', adminController.listFaculty)
router.post('/faculty', adminController.createFaculty)
router.get('/users', adminController.listUsers)
router.delete('/users/:id', adminController.deleteUser)
router.put('/users/:id', adminController.updateUser)

module.exports = router
