const express = require("express");
const { register, login, refresh, logout, getMe } = require("../controllers/auth.controller");
const { authUser } = require("../middlewares/auth.middleware");
const { loginLimiter, registerLimiter, refreshLimiter } = require("../middlewares/rateLimit.middleware");

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", logout);
router.get("/me", authUser, getMe);

module.exports = router;
