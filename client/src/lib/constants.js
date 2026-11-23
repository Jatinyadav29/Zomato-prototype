export const CITIES = {
  Bhopal: { lat: 23.2599, lng: 77.4126, areas: ["MP Nagar", "Arera Colony", "New Market", "Kolar Road", "Indrapuri", "Bittan Market", "Habibganj", "Shahpura"] },
  Indore: { lat: 22.7196, lng: 75.8577, areas: ["Vijay Nagar", "Palasia", "Rajwada", "Sapna Sangeeta", "Bhawarkua", "Sarafa", "Nipania", "Rau"] },
  Delhi: { lat: 28.6139, lng: 77.209, areas: ["Connaught Place", "Hauz Khas", "Karol Bagh", "Lajpat Nagar", "Saket", "Rajouri Garden", "Chandni Chowk", "Dwarka"] },
  Mumbai: { lat: 19.076, lng: 72.8777, areas: ["Andheri West", "Bandra West", "Powai", "Colaba", "Lower Parel", "Malad", "Dadar", "Juhu"] },
  Bengaluru: { lat: 12.9716, lng: 77.5946, areas: ["Koramangala", "Indiranagar", "HSR Layout", "Whitefield", "Jayanagar", "MG Road", "Marathahalli", "BTM Layout"] },
  Pune: { lat: 18.5204, lng: 73.8567, areas: ["Koregaon Park", "Kothrud", "Baner", "Viman Nagar", "Hinjewadi", "Aundh", "Camp", "Shivajinagar"] },
  Hyderabad: { lat: 17.385, lng: 78.4867, areas: ["Banjara Hills", "Jubilee Hills", "Gachibowli", "Hitech City", "Kukatpally", "Secunderabad", "Madhapur", "Ameerpet"] },
  Jaipur: { lat: 26.9124, lng: 75.7873, areas: ["C-Scheme", "Malviya Nagar", "Vaishali Nagar", "MI Road", "Raja Park", "Mansarovar", "Bapu Bazaar", "Tonk Road"] },
};
export const CITY_NAMES = Object.keys(CITIES);

export const CUISINES = ["North Indian", "South Indian", "Chinese", "Biryani", "Pizza", "Street Food", "Desserts"];

export const CATEGORIES = [
  "Main Course", "Starters", "Breads", "Rice", "Dosa", "Idli & Vada", "Beverages", "Noodles", "Momos", "Soups",
  "Biryani", "Sides", "Desserts", "Pizza", "Pasta", "Chaat", "Snacks", "Rolls", "Indian Sweets", "Ice Cream & Kulfi", "Bakes",
];

// Photo per cuisine (free Unsplash photos, see CREDITS.md)
export const CUISINE_PHOTOS = {
  "North Indian": ["/food/north-indian.jpg", "/food/paneer-tikka.jpg", "/food/curry.jpg", "/food/thali.jpg"],
  "South Indian": ["/food/dosa-top.jpg", "/food/idli.jpg", "/food/south-indian.jpg", "/food/idli-leaf.jpg"],
  Chinese: ["/food/momos.jpg", "/food/noodles-2.jpg", "/food/noodles.jpg", "/food/dimsum.jpg"],
  Biryani: ["/food/biryani.jpg", "/food/biryani-3.jpg", "/food/veg-biryani.jpg"],
  Pizza: ["/food/margherita.jpg", "/food/pizza-board.jpg", "/food/pizza.jpg", "/food/pizza-paper.jpg", "/food/pizza-spinach.jpg", "/food/pizza-slice.jpg"],
  "Street Food": ["/food/vada-pav.jpg", "/food/street-food.jpg", "/food/vada-pav-2.jpg", "/food/burgers.jpg"],
  Desserts: ["/food/gulab-jamun.jpg", "/food/desserts.jpg", "/food/jalebi.jpg"],
};

export const CUISINE_TINTS = {
  "North Indian": "var(--orange)",
  "South Indian": "var(--green)",
  Chinese: "var(--tomato)",
  Biryani: "var(--yellow)",
  Pizza: "var(--orange)",
  "Street Food": "var(--green)",
  Desserts: "var(--pink)",
};

function hash(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const KEYWORDS = [
  ["Biryani", /biryani|biriyani|dum\b|pulao/i],
  ["Pizza", /pizza|pasta|garlic bread|slice/i],
  ["Chinese", /chinese|momo|noodle|wok|bamboo|manchurian|dragon|hakka|chilli/i],
  ["South Indian", /dosa|idli|vada|uttapam|appam|tiffin|udupi|sambar|bhavan|dakshin/i],
  ["Street Food", /chaat|puri|pav|snack|samosa|dabeli|roll|bhel|street/i],
  ["Desserts", /sweet|dessert|halwa|kulfi|ice cream|cake|bake|mithai/i],
];
// Restaurant docs populated inside orders have no cuisines, so guess from names.
export function dishPhoto(text, fallback) {
  const c = guessCuisine(text);
  if (!c) return fallback;
  const list = CUISINE_PHOTOS[c];
  return list[hash(text) % list.length];
}

export function guessCuisine(text = "") {
  return KEYWORDS.find(([, re]) => re.test(text))?.[0];
}

export function photoFor(restaurant, hint = "") {
  const cuisine = restaurant?.cuisines?.[0] || guessCuisine(`${restaurant?.name || ""} ${hint}`) || "North Indian";
  const list = CUISINE_PHOTOS[cuisine] || CUISINE_PHOTOS["North Indian"];
  // ObjectIds share long prefixes, so hash the tail for a better spread.
  const key = String(restaurant?._id || restaurant?.name || hint);
  return list[hash(key.slice(-8) + key) % list.length];
}
export function tintFor(restaurant) {
  const tints = ["var(--orange)", "var(--green)", "var(--yellow)", "var(--pink)", "var(--tomato)"];
  return tints[hash(restaurant?._id) % tints.length];
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatINR = (n) => inr.format(n || 0);
const num = new Intl.NumberFormat("en-IN");
export const formatNum = (n) => num.format(n || 0);

const dt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const d = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
export const formatDateTime = (iso) => (iso ? dt.format(new Date(iso)) : "");
export const formatDate = (iso) => (iso ? d.format(new Date(iso)) : "");

// IST calendar date as YYYY-MM-DD
export function istDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

export const NEXT_STATUSES = {
  placed: ["preparing", "cancelled"],
  preparing: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};
export const STATUS_LABEL = { placed: "Placed", preparing: "Cooking", delivered: "Delivered", cancelled: "Cancelled" };
export const ACTION_LABEL = { preparing: "Start cooking", delivered: "Mark delivered", cancelled: "Cancel" };
export const PAYMENT_LABEL = { upi: "UPI", card: "Card", cod: "Cash on delivery" };

export const idOf = (ref) => (ref && typeof ref === "object" ? ref._id : ref);
