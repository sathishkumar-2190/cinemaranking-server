// ─────────────────────────────────────────────
//  Simple in-memory cache
//  Stores TMDB responses so repeated calls
//  return instantly without hitting TMDB again
// ─────────────────────────────────────────────

const store = new Map();

// How long to cache each type of data (ms)
const TTL = {
  trending:  5  * 60 * 1000,  // 5 min  — changes often
  popular:   10 * 60 * 1000,  // 10 min
  genres:    30 * 60 * 1000,  // 30 min — very stable
  details:   60 * 60 * 1000,  // 1 hour — rarely changes
  search:    2  * 60 * 1000,  // 2 min  — user-specific
  rankings:  15 * 60 * 1000,  // 15 min
  upcoming:  30 * 60 * 1000,  // 30 min
  default:   10 * 60 * 1000,  // 10 min fallback
};

// Decide TTL based on endpoint pattern
const getTTL = (key) => {
  if (key.includes("trending"))            return TTL.trending;
  if (key.includes("popular"))             return TTL.popular;
  if (key.includes("discover"))            return TTL.genres;
  if (key.includes("details"))             return TTL.details;
  if (key.includes("search"))              return TTL.search;
  if (key.includes("rankings"))            return TTL.rankings;
  if (key.includes("upcoming"))            return TTL.upcoming;
  return TTL.default;
};

export const cache = {
  // Get cached value — returns null if missing or expired
  get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.data;
  },

  // Store a value with auto TTL
  set(key, data) {
    store.set(key, {
      data,
      expiresAt: Date.now() + getTTL(key),
    });
  },

  // Clear everything (useful for testing)
  clear() {
    store.clear();
  },

  // How many items are cached right now
  size() {
    return store.size;
  },
};