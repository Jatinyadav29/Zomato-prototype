const express = require("express");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const env = require("./config/env");

const authRoutes = require("./routes/auth.routes");
const restaurantRoutes = require("./routes/restaurant.routes");
const orderRoutes = require("./routes/order.routes");
const reviewRoutes = require("./routes/review.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const { notFound, errorHandler } = require("./middlewares/error.middleware");

const app = express();

// Security headers (also removes X-Powered-By). No CORS middleware on purpose:
// the client is served from the same origin (Vite proxies /api). If the API ever
// moves to another origin, add cors() with an explicit origin allow-list.
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(morgan(env.isProduction ? "combined" : "dev"));

app.get("/", (req, res) => {
  res.json({ message: "FoodHub API is running" });
});

app.use("/api/auth", authRoutes);

// Must come BEFORE restaurantRoutes, otherwise /api/restaurants/search
// would be caught by /api/restaurants/:id with id = "search".
app.use("/api", analyticsRoutes);

app.use("/api/restaurants", restaurantRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
