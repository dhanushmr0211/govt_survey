const express = require('express');

const { authenticate } = require('../middleware/auth');
const { register, login, me, listUsers } = require('../controllers/authController');

const authRouter = express.Router();

authRouter.post('/register', authenticate, register);
authRouter.post('/login', login);
authRouter.get('/me', authenticate, me);
authRouter.get('/users', authenticate, listUsers);

module.exports = { authRouter };