// ─────────────────────────────────────────────
//  Auth routes
//  Thin wrapper — most auth is handled by
//  Supabase on the frontend directly.
//  These routes are for server-side operations.
// ─────────────────────────────────────────────
import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import supabase from "../supabase.js";

const router = Router();

/* GET /api/auth/me
   Returns the logged-in user's profile */
router.get("/me", verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    res.json({
      id:    req.user.id,
      email: req.user.email,
      profile: data || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /api/auth/profile
   Create or update user profile */
router.post("/profile", verifyToken, async (req, res) => {
  try {
    const { username, avatar_url } = req.body;

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: req.user.id,
        username,
        avatar_url,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;