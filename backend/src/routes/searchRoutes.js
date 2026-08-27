const express = require('express');
const router = express.Router();
const { searchPosts, searchNearby, getSearchSuggestions } = require('../controllers/searchController');
const { optionalAuthenticate } = require('../middleware/authMiddleware');
const { validateSearch } = require('../middleware/validateMiddleware');

router.get('/posts', optionalAuthenticate, validateSearch, searchPosts);
router.get('/nearby', optionalAuthenticate, searchNearby);
router.get('/suggestions', getSearchSuggestions);

module.exports = router;
