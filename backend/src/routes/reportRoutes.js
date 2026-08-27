const express = require('express');
const router = express.Router();
const { createReport, getMyReports, getReport, cancelReport } = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateCreateReport } = require('../middleware/validateMiddleware');
const { reportLimiter } = require('../middleware/rateLimitMiddleware');

router.post('/', authenticate, reportLimiter, validateCreateReport, createReport);
router.get('/my-reports', authenticate, getMyReports);
router.get('/:id', authenticate, getReport);
router.patch('/:id/cancel', authenticate, cancelReport);

module.exports = router;
