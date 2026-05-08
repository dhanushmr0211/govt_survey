const express = require('express');

const { authenticate } = require('../middleware/auth');
const { getIssuesHandler, createIssueHandler, resolveIssueHandler } = require('../controllers/issueController');

const issueRouter = express.Router({ mergeParams: true });

issueRouter.use(authenticate);

issueRouter.get('/', getIssuesHandler);
issueRouter.post('/', createIssueHandler);
issueRouter.patch('/:id/resolve', resolveIssueHandler);

module.exports = { issueRouter };