import { api } from "./client";

export const authApi = {
  login: (body) => api("/auth/login", { method: "POST", body, auth: false }),
  register: (body) => api("/auth/register", { method: "POST", body, auth: false }),
  me: () => api("/auth/me"),
  logout: () => api("/auth/logout", { method: "POST", auth: false }),
};

export const restaurantsApi = {
  list: ({ city, page = 1, limit = 12 }) => api("/restaurants", { query: { city, page, limit }, auth: false }),
  get: (id) => api(`/restaurants/${id}`, { auth: false }),
  mine: () => api("/restaurants/mine"),
  topPerformers: () => api("/restaurants/top-performers", { auth: false }),
  create: (body) => api("/restaurants", { method: "POST", body }),
  update: (id, body) => api(`/restaurants/${id}`, { method: "PATCH", body }),
  remove: (id) => api(`/restaurants/${id}`, { method: "DELETE" }),
};

export const menuApi = {
  list: (id, { category, isVeg } = {}) => api(`/restaurants/${id}/menu`, { query: { category, isVeg }, auth: false }),
  create: (id, body) => api(`/restaurants/${id}/menu`, { method: "POST", body }),
  update: (id, itemId, body) => api(`/restaurants/${id}/menu/${itemId}`, { method: "PATCH", body }),
  remove: (id, itemId) => api(`/restaurants/${id}/menu/${itemId}`, { method: "DELETE" }),
};

export const ordersApi = {
  create: (body) => api("/orders", { method: "POST", body }),
  mine: ({ page = 1, limit = 10 }) => api("/orders/my", { query: { page, limit } }),
  forRestaurant: (id, { page = 1, limit = 20, status }) =>
    api(`/restaurants/${id}/orders`, { query: { page, limit, status } }),
  setStatus: (orderId, status) => api(`/orders/${orderId}/status`, { method: "PATCH", body: { status } }),
};

export const reviewsApi = {
  create: (body) => api("/reviews", { method: "POST", body }),
  forRestaurant: (id, { page = 1, limit = 6 }) => api(`/restaurants/${id}/reviews`, { query: { page, limit }, auth: false }),
};

// Revenue and top customers are implemented. The rest return 501 for now and
// the UI shows "coming soon" for them.
export const analyticsApi = {
  revenue: (id, { from, to }) => api(`/analytics/restaurants/${id}/revenue`, { query: { from, to } }),
  topCustomers: (id, { limit }) => api(`/analytics/restaurants/${id}/top-customers`, { query: { limit } }),
  restaurant: (id, kind) => api(`/analytics/restaurants/${id}/${kind}`),
  cityRevenue: () => api("/analytics/platform/city-revenue"),
  monthlyTrend: () => api("/analytics/platform/monthly-trend"),
};
