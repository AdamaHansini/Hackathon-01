/**
 * Geo utilities for LostLink
 * Uses Haversine formula for distance calculation
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 */
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Haversine distance between two lat/lng points (returns km)
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  if (
    lat1 == null || lng1 == null ||
    lat2 == null || lng2 == null
  ) return null;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

/**
 * Score location proximity between two posts (0–100).
 *
 * Scoring scale:
 *   < 0.5 km  → 100
 *   < 1 km    → 90
 *   < 2 km    → 75
 *   < 5 km    → 55
 *   < 10 km   → 35
 *   < 20 km   → 15
 *   >= 20 km  → 0
 *
 * Falls back to city-name match if coordinates are unavailable.
 */
const scoreLocationProximity = (post1, post2) => {
  const coords1 = post1.approximateCoordinates;
  const coords2 = post2.approximateCoordinates;

  const hasCoords = (c) =>
    c &&
    Array.isArray(c.coordinates) &&
    c.coordinates.length === 2 &&
    c.coordinates[0] != null &&
    c.coordinates[1] != null;

  if (hasCoords(coords1) && hasCoords(coords2)) {
    // GeoJSON is [lng, lat]
    const [lng1, lat1] = coords1.coordinates;
    const [lng2, lat2] = coords2.coordinates;
    const distKm = haversineDistance(lat1, lng1, lat2, lng2);

    if (distKm < 0.5) return 100;
    if (distKm < 1) return 90;
    if (distKm < 2) return 75;
    if (distKm < 5) return 55;
    if (distKm < 10) return 35;
    if (distKm < 20) return 15;
    return 0;
  }

  // Fallback: city match
  if (post1.city && post2.city) {
    if (post1.city.toLowerCase() === post2.city.toLowerCase()) return 60;
    return 0;
  }

  // Fallback: location name token overlap
  if (post1.locationName && post2.locationName) {
    const tokens1 = new Set(post1.locationName.toLowerCase().split(/\s+/));
    const tokens2 = new Set(post2.locationName.toLowerCase().split(/\s+/));
    const intersection = [...tokens1].filter((t) => tokens2.has(t));
    const overlap = intersection.length / Math.max(tokens1.size, tokens2.size);
    return Math.round(overlap * 60); // max 60 without coords
  }

  return 0;
};

/**
 * Build a MongoDB $geoNear-compatible bounding box query
 */
const buildGeoQuery = (lat, lng, radiusKm) => ({
  $geoWithin: {
    $centerSphere: [[lng, lat], radiusKm / EARTH_RADIUS_KM],
  },
});

module.exports = {
  haversineDistance,
  scoreLocationProximity,
  buildGeoQuery,
  toRad,
};
