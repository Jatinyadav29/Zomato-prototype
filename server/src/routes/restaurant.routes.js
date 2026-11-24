const express = require("express");
const {
  getRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getTopPerformers,
  getMyRestaurants,
} = require("../controllers/restaurant.controller");
const {
  getMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require("../controllers/menu.controller");
const { getRestaurantOrders } = require("../controllers/order.controller");
const { getRestaurantReviews } = require("../controllers/review.controller");
const { authUser, authorize } = require("../middlewares/auth.middleware");
const { ownerOfRestaurant } = require("../middlewares/ownership.middleware");

const router = express.Router();

// Every owner route on /:id/... goes through ownerOfRestaurant, which checks the
// logged-in owner owns :id and sets req.restaurant. Never use authorize("owner") alone there.

// Restaurants
router.get("/", getRestaurants);
// [frontend fix] static paths must be registered BEFORE "/:id", otherwise
// Express treats "mine" / "top-performers" as an id.
router.get("/mine", authUser, authorize("owner"), getMyRestaurants);
router.get("/top-performers", getTopPerformers);
router.get("/:id", getRestaurantById);
router.post("/", authUser, authorize("owner"), createRestaurant);
router.patch("/:id", ownerOfRestaurant, updateRestaurant);
router.delete("/:id", ownerOfRestaurant, deleteRestaurant);

// Menu of a restaurant
router.get("/:id/menu", getMenu);
router.post("/:id/menu", ownerOfRestaurant, createMenuItem);
router.patch("/:id/menu/:itemId", ownerOfRestaurant, updateMenuItem);
router.delete("/:id/menu/:itemId", ownerOfRestaurant, deleteMenuItem);

// Orders of a restaurant (owner dashboard)
router.get("/:id/orders", ownerOfRestaurant, getRestaurantOrders);

// Reviews of a restaurant
router.get("/:id/reviews", getRestaurantReviews);

// Owner analytics (revenue, top customers, ...) live under /api/analytics/restaurants/:id/*

module.exports = router;
