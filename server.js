// ─────────────────────────────────────────────
//  CinemaRanking — Express server
//  Handles:
//   • TMDB API proxy  (hides your API key)
//   • Watchlist CRUD  (Supabase)
//   • Auth helpers    (Supabase JWT verify)
// ─────────────────────────────────────────────
import "dotenv/config";
import express from "express";
import cors    from "cors";

import tmdbRoutes      from "./routes/tmdb.js";
import watchlistRoutes from "./routes/watchlist.js";
import authRoutes      from "./routes/auth.js";

const app  = express();
const PORT = process.env.PORT || 8080;

/* ── MIDDLEWARE ────────────────────────────── */
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

/* ── ROUTES ────────────────────────────────── */
app.use("/api/tmdb",      tmdbRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/auth",      authRoutes);

/* ── HEALTH CHECK ──────────────────────────── */
app.get("/api/health", (req, res) => {
  res.json({
    status:  "ok",
    server:  "CinemaRanking API",
    time:    new Date().toISOString(),
  });
});

/* ── 404 ───────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

/* ── ERROR HANDLER ─────────────────────────── */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});



app.listen(PORT, "0.0.0.0", () => {
  console.log(`🎬 CinemaRanking server running on port ${PORT}`);
  console.log(`   Health: /api/health`);
});