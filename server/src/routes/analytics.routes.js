const express = require("express");
const {
  getRevenue,
  getTopDishes,
  getPeakHours,
  getStatusBreakdown,
  getTopCustomers,
  getRatings,
  getCityRevenue,
  getMonthlyTrend,
  searchRestaurants,
  getNearbyRestaurants,
} = require("../controllers/analytics.controller");
const { authUser } = require("../middlewares/auth.middleware");
const { ownerOfRestaurant } = require("../middlewares/ownership.middleware");

// This router is mounted at /api (see app.js), so paths below are full paths.
const router = express.Router();

// Restaurant analytics (owner dashboard)
router.get("/analytics/restaurants/:id/revenue", ownerOfRestaurant, getRevenue);
router.get("/analytics/restaurants/:id/top-dishes", ownerOfRestaurant, getTopDishes);
router.get("/analytics/restaurants/:id/peak-hours", ownerOfRestaurant, getPeakHours);
router.get("/analytics/restaurants/:id/status-breakdown", ownerOfRestaurant, getStatusBreakdown);
router.get("/analytics/restaurants/:id/top-customers", ownerOfRestaurant, getTopCustomers);
router.get("/analytics/restaurants/:id/ratings", ownerOfRestaurant, getRatings);

// Platform analytics (any logged-in user for now; there is no admin role yet)
router.get("/analytics/platform/city-revenue", authUser, getCityRevenue);
router.get("/analytics/platform/monthly-trend", authUser, getMonthlyTrend);

// Public restaurant discovery
router.get("/restaurants/search", searchRestaurants);
router.get("/restaurants/nearby", getNearbyRestaurants);

module.exports = router;
