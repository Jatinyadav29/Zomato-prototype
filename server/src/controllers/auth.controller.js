const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/user.model");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
} = require("../utils/token");

const REFRESH_COOKIE = "refreshToken";

// Compared against when the email doesn't exist, so a login for an unknown email
// takes as long as a wrong password and response time doesn't reveal who has an account.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

// A refresh token that was already rotated away is normally a sign it was stolen.
// Tabs that refresh at the same moment can legitimately send the previous token,
// so only tokens older than this (relative to the current one) count as reuse.
const REUSE_GRACE_MS = 30 * 1000;

// The browser only sends this cookie to /api/auth/* routes.
function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: env.isProduction,
    path: "/api/auth",
  };
}

// Never send password or refreshToken hash back to the client
function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    city: user.city,
    createdAt: user.createdAt,
  };
}

// Creates both tokens, saves the refresh token hash and sets the cookie.
// Returns the access token so it can be sent in the JSON body.
async function issueTokens(res, user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const { iat, exp } = jwt.decode(refreshToken);
  user.refreshToken = await hashRefreshToken(refreshToken);
  user.refreshTokenIssuedAt = new Date(iat * 1000);
  await user.save();

  // Cookie expires at the same moment as the refresh token itself
  res.cookie(REFRESH_COOKIE, refreshToken, { ...getCookieOptions(), expires: new Date(exp * 1000) });

  return accessToken;
}

function rejectRefresh(res, message) {
  res.clearCookie(REFRESH_COOKIE, getCookieOptions());
  return res.status(401).json({ message });
}

// POST /api/auth/register
async function register(req, res) {
  const { name, email, password, role = "customer", city } = req.body;

  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "name, email and password are required" });
  }
  if (password.length < 6 || password.length > 128) {
    return res.status(400).json({ message: "Password must be 6 to 128 characters" });
  }
  if (!["customer", "owner"].includes(role)) {
    return res.status(400).json({ message: "role must be customer or owner" });
  }

  // No unique index yet, so we check for duplicates by hand
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ message: "Email is already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role,
    city,
  });

  const accessToken = await issueTokens(res, user);
  res.status(201).json({ message: "Registered successfully", user: toPublicUser(user), accessToken });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "email and password are required" });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
  const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_PASSWORD_HASH);
  if (!user || !isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const accessToken = await issueTokens(res, user);
  res.json({ message: "Logged in successfully", user: toPublicUser(user), accessToken });
}

// POST /api/auth/refresh
// Gives a new access token AND a new refresh token (rotation).
async function refresh(req, res) {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) {
    return rejectRefresh(res, "Refresh token missing");
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return rejectRefresh(res, "Invalid or expired refresh token");
  }

  const user = await User.findById(payload.id).select("+refreshToken +refreshTokenIssuedAt");
  if (!user || !user.refreshToken) {
    return rejectRefresh(res, "Invalid refresh token");
  }

  // Only the latest refresh token is accepted. Old (already rotated) ones fail here.
  const isMatch = await compareRefreshToken(token, user.refreshToken);
  if (!isMatch) {
    // An old, already-rotated token was replayed: someone else may hold this
    // session. End it for everyone so both sides have to log in again.
    const issuedAt = user.refreshTokenIssuedAt?.getTime() ?? 0;
    if (payload.iat * 1000 < issuedAt - REUSE_GRACE_MS) {
      await User.updateOne({ _id: user._id }, { refreshToken: null, refreshTokenIssuedAt: null });
      return rejectRefresh(res, "Session ended for security reasons. Please log in again.");
    }
    return rejectRefresh(res, "Invalid refresh token");
  }

  const accessToken = await issueTokens(res, user);
  res.json({ accessToken });
}

// POST /api/auth/logout
async function logout(req, res) {
  const token = req.cookies[REFRESH_COOKIE];

  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.findByIdAndUpdate(payload.id, { refreshToken: null, refreshTokenIssuedAt: null });
    } catch {
      // Token is invalid or expired: nothing to revoke, just clear the cookie
    }
  }

  res.clearCookie(REFRESH_COOKIE, getCookieOptions());
  res.json({ message: "Logged out successfully" });
}

// GET /api/auth/me
async function getMe(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json({ user: toPublicUser(user) });
}

module.exports = { register, login, refresh, logout, getMe };
