const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const authorizeRoles = require('../middleware/roleMiddleware');

router.get('/users', authorizeRoles('admin'), adminUserController.viewAllUsers);
router.post('/users/update', authorizeRoles('admin'), adminUserController.updateUserRoleLevel);
router.post('/users/delete', authorizeRoles('admin'), adminUserController.deleteUser);

module.exports = router;
