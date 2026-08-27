const ItemPost = require('../models/ItemPost');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { buildGeoQuery } = require('../utils/geoUtils');

/**
 * GET /api/search/posts
 * Full-text + filter search with pagination and sorting
 */
const searchPosts = asyncHandler(async (req, res) => {
  const {
    q,
    category,
    type,
    city,
    location,
    dateFrom,
    dateTo,
    color,
    brand,
    sort = 'newest',
    page = 1,
    limit = 12,
  } = req.query;

  const filter = {
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    moderationStatus: 'APPROVED',
  };

  // Text search
  if (q && q.trim()) {
    filter.$text = { $search: q.trim() };
  }

  // Filters
  if (type) filter.type = type.toUpperCase();
  if (category) filter.category = category;
  if (city) filter.city = city.toLowerCase().trim();
  if (color) filter.color = new RegExp(color.trim(), 'i');
  if (brand) filter.brand = new RegExp(brand.trim(), 'i');
  if (location) filter.locationName = new RegExp(location.trim(), 'i');

  if (dateFrom || dateTo) {
    filter.lostOrFoundDate = {};
    if (dateFrom) filter.lostOrFoundDate.$gte = new Date(dateFrom);
    if (dateTo) filter.lostOrFoundDate.$lte = new Date(dateTo);
  }

  // Sorting
  let sortQuery;
  switch (sort) {
    case 'newest':
      sortQuery = { createdAt: -1 };
      break;
    case 'oldest':
      sortQuery = { createdAt: 1 };
      break;
    case 'date_desc':
      sortQuery = { lostOrFoundDate: -1 };
      break;
    case 'date_asc':
      sortQuery = { lostOrFoundDate: 1 };
      break;
    case 'relevance':
      sortQuery = q ? { score: { $meta: 'textScore' }, createdAt: -1 } : { createdAt: -1 };
      break;
    default:
      sortQuery = { createdAt: -1 };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const projection = q
    ? { score: { $meta: 'textScore' } }
    : {};

  const [posts, total] = await Promise.all([
    ItemPost.find(filter, projection)
      .select('-privateIdentifyingDetails -privateCharacteristics')
      .populate('userId', 'name avatarUrl trustScore city')
      .sort(sortQuery)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ItemPost.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      posts,
      query: { q, type, category, city, color, brand, dateFrom, dateTo },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

/**
 * GET /api/search/nearby
 * Geospatial search for nearby posts
 */
const searchNearby = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5, type, category, page = 1, limit = 12 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: 'lat and lng query parameters are required.',
    });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const radiusKm = parseFloat(radius);

  if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusKm)) {
    return res.status(400).json({ success: false, message: 'Invalid coordinates or radius.' });
  }

  const filter = {
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    moderationStatus: 'APPROVED',
    'approximateCoordinates': {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], radiusKm / 6371],
      },
    },
  };

  if (type) filter.type = type.toUpperCase();
  if (category) filter.category = category;

  const skip = (Number(page) - 1) * Number(limit);

  const [posts, total] = await Promise.all([
    ItemPost.find(filter)
      .select('-privateIdentifyingDetails -privateCharacteristics')
      .populate('userId', 'name avatarUrl trustScore')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ItemPost.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      posts,
      search: { lat: latitude, lng: longitude, radiusKm },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

/**
 * GET /api/search/suggestions
 * Auto-complete suggestions from item names
 */
const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.json({ success: true, data: { suggestions: [] } });
  }

  const regex = new RegExp(`^${q.trim()}`, 'i');

  const posts = await ItemPost.find({
    itemName: regex,
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    moderationStatus: 'APPROVED',
  })
    .select('itemName category type')
    .limit(10)
    .lean();

  const suggestions = [
    ...new Map(posts.map((p) => [p.itemName.toLowerCase(), p.itemName])).values(),
  ].slice(0, 8);

  res.json({ success: true, data: { suggestions } });
});

module.exports = { searchPosts, searchNearby, getSearchSuggestions };
