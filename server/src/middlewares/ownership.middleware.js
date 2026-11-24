const findOwnedRestaurant = require("../utils/ownership");
const { authUser, authorize } = require("./auth.middleware");

// Loads the restaurant in req.params.id and checks it belongs to the logged-in owner.
// On success the restaurant is available as req.restaurant.
async function loadOwnedRestaurant(req, res, next) {
  const { restaurant, error } = await findOwnedRestaurant(req.params.id, req.user.id);
  if (error) {
    return res.status(error.status).json({ message: error.message });
  }
  req.restaurant = restaurant;
  next();
}

// Use on every route shaped like /restaurants/:id/... that only the owner may touch.
const ownerOfRestaurant = [authUser, authorize("owner"), loadOwnedRestaurant];

module.exports = { loadOwnedRestaurant, ownerOfRestaurant };
