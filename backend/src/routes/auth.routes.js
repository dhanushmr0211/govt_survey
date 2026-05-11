const express = require('express');

const { authenticate } = require('../middleware/auth');
const { register, login, me, listUsers, updateAccess } = require('../controllers/authController');

const authRouter = express.Router();

authRouter.post('/register', authenticate, register);
authRouter.post('/login', login);
authRouter.get('/me', authenticate, me);
authRouter.get('/users', authenticate, listUsers);
authRouter.put('/users/:id/access', authenticate, updateAccess);

module.exports = { authRouter };