const express = require('express');

const { authenticate } = require('../middleware/auth');
const { register, login, me, listUsers, getUserProjects, updateAccess, changePassword, uploadAvatar, deleteAvatar } = require('../controllers/authController');
const { upload } = require('../utils/upload');

const authRouter = express.Router();

authRouter.post('/register', authenticate, register);
authRouter.post('/login', login);
authRouter.get('/me', authenticate, me);
authRouter.get('/users', authenticate, listUsers);
authRouter.get('/users/:id/projects', authenticate, getUserProjects);
authRouter.put('/users/:id/access', authenticate, updateAccess);
authRouter.post('/change-password', authenticate, changePassword);
authRouter.post('/avatar', authenticate, upload.single('avatar'), uploadAvatar);
authRouter.delete('/avatar', authenticate, deleteAvatar);

module.exports = { authRouter };