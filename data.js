// ===== Constants + Helpers + LocalStorage =====

const CATEGORIES = [
  { id: "food",    label: "Food",         bg: "var(--c-food)",   ink: "#6b3027", deep: "var(--c-food-deep)",   icon: "🍜" },
  { id: "sight",   label: "Sightseeing",  bg: "var(--c-sight)",  ink: "#2f4a37", deep: "var(--c-sight-deep)",  icon: "⛩" },
  { id: "city",    label: "City",         bg: "var(--c-city)",   ink: "#2c4760", deep: "var(--c-city-deep)",   icon: "🏙" },
  { id: "shop",    label: "Shopping",     bg: "var(--c-shop)",   ink: "#583761", deep: "var(--c-shop-deep)",   icon: "🛍" },
  { id: "nature",  label: "Nature",       bg: "var(--c-nature)", ink: "#3f5326", deep: "var(--c-nature-deep)", icon: "🌿" },
  { id: "night",   label: "Nightlife",    bg: "var(--c-night)",  ink: "#3b3266", deep: "var(--c-night-deep)",  icon: "🌙" },
  { id: "onsen",   label: "Onsen / Spa",  bg: "var(--c-onsen)",  ink: "#6b4a1c", deep: "var(--c-onsen-deep)",  icon: "♨" },
  { id: "stay",    label: "Stay",         bg: "var(--c-stay)",   ink: "#5b3a1d", deep: "var(--c-stay-deep)",   icon: "🛏" },
];

const CAT_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

// Default trip window if user hasn't set one. Stored in state as ISO strings.
const DEFAULT_TRIP_START = "2026-05-10";
const DEFAULT_TRIP_END   = "2026-05-23";
function parseIsoDay(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// avatar palette for user pills
const AVATAR_COLORS = [
  "#D98B7E", "#7BA383", "#6E96BA", "#A87BB0",
  "#C99A4C", "#87A35A", "#7A6FA8", "#B98654",
];
function colorFor(name) {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

// date helpers
const DOW = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function addDays(d, n) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isoDay(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2,"0")} ${ap}`;
}

// localStorage glue
const LS_KEY = "japan-trip-state-v1";
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}
function saveState(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
}

// seed data — pre-populated reels so the board feels alive
function seed() {
  return {
    user: null,
    roster: [],
    tripStart: DEFAULT_TRIP_START,
    tripEnd: DEFAULT_TRIP_END,
    reels: [
      { id: "r1", title: "Tiny ramen counter in Shinjuku", url: "https://instagram.com/reel/abc1", category: "food",    note: "9 seats, midnight only", addedBy: "Sample", placedDay: null },
      { id: "r2", title: "Fushimi Inari at sunrise",       url: "https://instagram.com/reel/abc2", category: "sight",   note: "Get there by 5:45am",     addedBy: "Sample", placedDay: null },
      { id: "r3", title: "Shibuya scramble timelapse",     url: "https://instagram.com/reel/abc3", category: "city",    note: "Best view: 2F Starbucks",  addedBy: "Sample", placedDay: null },
      { id: "r4", title: "Vintage shop alley Shimokita",   url: "https://instagram.com/reel/abc4", category: "shop",    note: "",                          addedBy: "Sample", placedDay: null },
      { id: "r5", title: "Arashiyama bamboo grove",        url: "https://instagram.com/reel/abc5", category: "nature",  note: "Skip the busy gate",        addedBy: "Sample", placedDay: null },
      { id: "r6", title: "Golden Gai bar crawl",           url: "https://instagram.com/reel/abc6", category: "night",   note: "6 bars, ¥1000 cover each",  addedBy: "Sample", placedDay: null },
      { id: "r7", title: "Hakone open-air onsen ryokan",   url: "https://instagram.com/reel/abc7", category: "onsen",   note: "Book 2 months ahead",       addedBy: "Sample", placedDay: null },
      { id: "r8", title: "Tsukiji tamagoyaki stall",       url: "https://instagram.com/reel/abc8", category: "food",    note: "¥150, sweet omelette",      addedBy: "Sample", placedDay: null },
      { id: "r9", title: "teamLab Planets",                url: "https://instagram.com/reel/abc9", category: "sight",   note: "Wear shorts!",              addedBy: "Sample", placedDay: null },
    ],
    events: [
      // pre-seeded itinerary items to show what scheduled looks like
      { id: "e1", title: "Land at Haneda",          day: "2026-05-10", start: "15:00", end: "17:00", category: "stay",  addedBy: "Sample" },
      { id: "e2", title: "Check in to Shinjuku hotel", day: "2026-05-10", start: "18:30", end: "19:30", category: "stay", addedBy: "Sample" },
    ],
  };
}

window.JT = { CATEGORIES, CAT_BY_ID, DEFAULT_TRIP_START, DEFAULT_TRIP_END, parseIsoDay, colorFor, initialsOf, DOW, MONTHS, MONTHS_SHORT, startOfWeek, addDays, sameDay, isoDay, fmtTime, loadState, saveState, seed };
