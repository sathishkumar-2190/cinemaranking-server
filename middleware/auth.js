// ─────────────────────────────────────────────
//  Auth middleware
//  Verifies the Supabase JWT sent from the frontend
//  Usage: add verifyToken to any protected route
// ─────────────────────────────────────────────
import supabase from "../supabase.js";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  // Verify the token with Supabase
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Attach user to request so routes can use it
  req.user = data.user;
  next();
};