// ─────────────────────────────────────────────
//  Watchlist routes — protected (needs auth)
//  All operations scoped to the logged-in user
// ─────────────────────────────────────────────
import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import supabase from "../supabase.js";

const router = Router();

// All watchlist routes require login
router.use(verifyToken);

/* GET /api/watchlist
   Returns the user's full watchlist split by type */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", req.user.id)
      .order("rank", { ascending: true });

    if (error) throw error;

    const movies = data.filter(i => i.media_type === "movie");
    const series = data.filter(i => i.media_type === "tv");

    res.json({ movies, series });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /api/watchlist
   Add a movie or series to the watchlist */
router.post("/", async (req, res) => {
  try {
    const { tmdb_id, media_type, title, poster_path, vote_average, release_date, note } = req.body;

    if (!tmdb_id || !media_type) {
      return res.status(400).json({ error: "tmdb_id and media_type are required" });
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", req.user.id)
      .eq("tmdb_id", tmdb_id)
      .single();

    if (existing) {
      return res.status(409).json({ error: "Already in watchlist" });
    }

    // Get current max rank for this media type
    const { data: rankData } = await supabase
      .from("watchlist")
      .select("rank")
      .eq("user_id", req.user.id)
      .eq("media_type", media_type)
      .order("rank", { ascending: false })
      .limit(1);

    const nextRank = rankData?.[0]?.rank ? rankData[0].rank + 1 : 1;

    const { data, error } = await supabase
      .from("watchlist")
      .insert({
        user_id: req.user.id,
        tmdb_id,
        media_type,
        title,
        poster_path,
        vote_average,
        release_date,
        note: note || "",
        rank: nextRank,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* DELETE /api/watchlist/:tmdb_id
   Remove an item from the watchlist */
router.delete("/:tmdb_id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("user_id", req.user.id)
      .eq("tmdb_id", req.params.tmdb_id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* PATCH /api/watchlist/:tmdb_id/note
   Update the note on a watchlist item */
router.patch("/:tmdb_id/note", async (req, res) => {
  try {
    const { note } = req.body;

    const { data, error } = await supabase
      .from("watchlist")
      .update({ note })
      .eq("user_id", req.user.id)
      .eq("tmdb_id", req.params.tmdb_id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* PATCH /api/watchlist/reorder
   Save new drag-and-drop order */
router.patch("/reorder", async (req, res) => {
  try {
    // Expects: [{ tmdb_id, rank }, ...]
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "items array required" });
    }

    // Update each item's rank
    const updates = items.map(({ tmdb_id, rank }) =>
      supabase
        .from("watchlist")
        .update({ rank })
        .eq("user_id", req.user.id)
        .eq("tmdb_id", tmdb_id)
    );

    await Promise.all(updates);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;