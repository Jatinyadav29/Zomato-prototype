const Restaurant = require("../models/restaurant.model");
const MenuItem = require("../models/menuItem.model");
const getPagination = require("../utils/pagination");
const Order = require("../models/order.model");

// Turns lng/lat from the request body into a GeoJSON point (or null if invalid)
function buildLocation(lng, lat) {
  const longitude = Number(lng);
  const latitude = Number(lat);

  const isValid =
    lng !== undefined &&
    lat !== undefined &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90;

  return isValid ? { type: "Point", coordinates: [longitude, latitude] } : null;
}

// GET /api/restaurants?page=1&limit=10&city=Bhopal
async function getRestaurants(req, res) {
  const { page, limit, skip } = getPagination(req.query);

  const filter = {};
  if (req.query.city) {
    filter.city = String(req.query.city);
  }

  const [restaurants, total] = await Promise.all([
    Restaurant.find(filter).sort({ name: 1, _id: 1 }).skip(skip).limit(limit),
    Restaurant.countDocuments(filter),
  ]);

  res.json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    restaurants,
  });
}

// [frontend fix] GET /api/restaurants/mine (owner): restaurants of the logged-in owner
async function getMyRestaurants(req, res) {
  const restaurants = await Restaurant.find({ owner: req.user.id }).sort({ name: 1, _id: 1 });
  res.json({ count: restaurants.length, restaurants });
}

// GET /api/restaurants/:id
async function getRestaurantById(req, res) {
  const restaurant = await Restaurant.findById(req.params.id).populate(
    "owner",
    "name",
  );
  if (!restaurant) {
    return res.status(404).json({ message: "Restaurant not found" });
  }
  res.json({ restaurant });
}

// POST /api/restaurants  (owner)
// Body: { name, city, area, cuisines: [], lng, lat, isOpen }
async function createRestaurant(req, res) {
  const { name, city, area, cuisines, lng, lat, isOpen } = req.body;

  const location = buildLocation(lng, lat);
  if (!location) {
    return res.status(400).json({ message: "Valid lng and lat are required" });
  }

  const restaurant = await Restaurant.create({
    name,
    owner: req.user.id,
    city,
    area,
    cuisines,
    location,
    isOpen,
  });

  res.status(201).json({ restaurant });
}

// PATCH /api/restaurants/:id  (owner, own restaurant only)
async function updateRestaurant(req, res) {
  const restaurant = req.restaurant; // set by ownerOfRestaurant

  // Only these fields can be changed
  const allowedFields = ["name", "city", "area", "cuisines", "isOpen"];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      restaurant[field] = req.body[field];
    }
  }

  if (req.body.lng !== undefined || req.body.lat !== undefined) {
    const location = buildLocation(req.body.lng, req.body.lat);
    if (!location) {
      return res
        .status(400)
        .json({ message: "Send both lng and lat with valid values" });
    }
    restaurant.location = location;
  }

  await restaurant.save();
  res.json({ restaurant });
}

// DELETE /api/restaurants/:id  (owner, own restaurant only)
async function deleteRestaurant(req, res) {
  const restaurant = req.restaurant; // set by ownerOfRestaurant

  // Restaurant first: if the menu cleanup then fails, the leftovers are orphaned
  // items nobody can reach, not a live restaurant with an empty menu.
  // Old orders and reviews are kept for history.
  await restaurant.deleteOne();
  await MenuItem.deleteMany({ restaurant: restaurant._id });

  res.json({ message: "Restaurant deleted" });
}

// GET /api/restaurants/top-performers  (public)
// Ranking is the same for every visitor and the aggregation scans many orders,
// so the result is cached for a few minutes. Concurrent requests share one query.
const TOP_PERFORMERS_SINCE = new Date("2026-09-06T00:00:00Z");
const TOP_PERFORMERS_TTL_MS = 5 * 60 * 1000;
const topPerformersCache = { data: null, expiresAt: 0, pending: null };

function loadTopPerformers() {
  return Order.aggregate([
    { $match: { status: "delivered", createdAt: { $gte: TOP_PERFORMERS_SINCE } } },
    { $group: { _id: "$restaurant", revenue: { $sum: "$totalAmount" } } },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "restaurants",
        localField: "_id",
        foreignField: "_id",
        as: "restaurant",
        // Public endpoint: only the fields a restaurant card shows
        pipeline: [{ $project: { name: 1, city: 1, area: 1, cuisines: 1, isOpen: 1 } }],
      },
    },
    { $unwind: "$restaurant" },
    // Revenue is used for ranking only; it is never sent to the public
    { $project: { revenue: 0 } },
  ]);
}

async function getTopPerformers(req, res) {
  if (!topPerformersCache.data || Date.now() >= topPerformersCache.expiresAt) {
    topPerformersCache.pending ??= loadTopPerformers()
      .then((data) => {
        topPerformersCache.data = data;
        topPerformersCache.expiresAt = Date.now() + TOP_PERFORMERS_TTL_MS;
      })
      .finally(() => {
        topPerformersCache.pending = null;
      });
    await topPerformersCache.pending;
  }

  return res.json({
    message: "Top performing restaurants fetched",
    topPerformers: topPerformersCache.data,
  });
}

module.exports = {
  getRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getTopPerformers,
  getMyRestaurants,
};
