import { Router } from "express";
import { cache }  from "../cache.js";

const router   = Router();

// Railway server is outside India — api.tmdb.org works fine here
const BASE_URL = "https://api.tmdb.org/3";

// ─────────────────────────────────────────────
//  Core fetch — checks cache first, then TMDB
// ─────────────────────────────────────────────
const tmdb = async (endpoint) => {
  // ⚡ Return cached response if available
  const cached = cache.get(endpoint);
  if (cached) return cached;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);

  const data = await res.json();
  cache.set(endpoint, data); // 💾 store for next time
  return data;
};

const handle = (fn) => async (req, res) => {
  try {
    const data = await fn(req);
    res.json(data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ── TRENDING ── */
router.get("/trending/movies",  handle(() => tmdb("/trending/movie/week")));
router.get("/trending/series",  handle(() => tmdb("/trending/tv/week")));
router.get("/trending/all",     handle(async () => {
  const [movies, series] = await Promise.all([
    tmdb("/trending/movie/week"),
    tmdb("/trending/tv/week"),
  ]);
  return {
    results: [
      ...(movies.results||[]).map(m=>({...m,media_type:"movie"})),
      ...(series.results||[]).map(s=>({...s,media_type:"tv"})),
    ]
  };
}));

/* ── MOVIES ── */
router.get("/movies/popular",      handle(() => tmdb("/movie/popular")));
router.get("/movies/top-rated",    handle(() => tmdb("/movie/top_rated")));
router.get("/movies/now-playing",  handle(() => tmdb("/movie/now_playing")));
router.get("/movies/upcoming",     handle((req) => tmdb(`/movie/upcoming?page=${req.query.page||1}`)));

/* ── SERIES ── */
router.get("/series/popular",      handle(() => tmdb("/tv/popular")));
router.get("/series/top-rated",    handle(() => tmdb("/tv/top_rated")));
router.get("/series/airing-today", handle(() => tmdb("/tv/airing_today")));

/* ── DETAILS ── */
router.get("/details/:mediaType/:id", handle((req) => {
  const { mediaType, id } = req.params;
  return tmdb(`/${mediaType}/${id}?append_to_response=videos,images,watch/providers,reviews,external_ids,belongs_to_collection`);
}));
router.get("/details/:mediaType/:id/credits", handle((req) => {
  const { mediaType, id } = req.params;
  return tmdb(`/${mediaType}/${id}/credits`);
}));
router.get("/details/:mediaType/:id/similar", handle((req) => {
  const { mediaType, id } = req.params;
  return tmdb(`/${mediaType}/${id}/similar`);
}));
router.get("/details/:mediaType/:id/videos", handle((req) => {
  const { mediaType, id } = req.params;
  return tmdb(`/${mediaType}/${id}/videos`);
}));

/* ── TV SEASONS ── */
router.get("/tv/:id/season/:seasonNumber", handle((req) => {
  const { id, seasonNumber } = req.params;
  return tmdb(`/tv/${id}/season/${seasonNumber}`);
}));

/* ── PERSON ── */
router.get("/person/:id", handle((req) =>
  tmdb(`/person/${req.params.id}?append_to_response=combined_credits,images`)
));

/* ── SEARCH ── */
router.get("/search", handle((req) =>
  tmdb(`/search/multi?query=${encodeURIComponent(req.query.q||"")}&include_adult=false`)
));
router.get("/search/keywords", handle((req) =>
  tmdb(`/search/keyword?query=${encodeURIComponent(req.query.q||"")}`)
));

/* ── DISCOVER ── */
router.get("/discover/:mediaType", handle((req) => {
  const type      = req.params.mediaType === "tv" ? "tv" : "movie";
  const genre     = req.query.genre     || req.query.with_genres   || "";
  const sort      = req.query.sort      || req.query.sort_by       || "popularity.desc";
  const yearFrom  = req.query.yearFrom  || "";
  const yearTo    = req.query.yearTo    || "";
  const minRating = req.query.minRating || "";
  const language  = req.query.language  || "";
  const keyword   = req.query.keyword   || req.query.with_keywords || "";
  const page      = req.query.page      || 1;

  const dateGte = type === "movie" ? "primary_release_date.gte" : "first_air_date.gte";
  const dateLte = type === "movie" ? "primary_release_date.lte" : "first_air_date.lte";

  let ep = `/discover/${type}?sort_by=${sort}&include_adult=false&page=${page}`;
  if (genre)     ep += `&with_genres=${genre}`;
  if (yearFrom)  ep += `&${dateGte}=${yearFrom}-01-01`;
  if (yearTo)    ep += `&${dateLte}=${yearTo}-12-31`;
  if (minRating) ep += `&vote_average.gte=${minRating}&vote_count.gte=100`;
  if (language)  ep += `&with_original_language=${language}`;
  if (keyword)   ep += `&with_keywords=${keyword}`;

  return tmdb(ep);
}));

/* ── COLLECTION ── */
router.get("/collection/:id", handle((req) =>
  tmdb(`/collection/${req.params.id}`)
));

/* ── RANKINGS ── */
router.get("/rankings/:mediaType", handle((req) => {
  const type = req.params.mediaType === "tv" ? "tv" : "movie";
  return tmdb(`/${type}/top_rated?page=${req.query.page||1}`);
}));

/* ── CACHE STATS ── */
router.get("/cache/stats", (req, res) => {
  res.json({ cached_entries: cache.size() });
});

export default router;