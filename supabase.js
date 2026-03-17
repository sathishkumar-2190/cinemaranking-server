// ─────────────────────────────────────────────
//  Supabase client — server side only
//  Uses the SERVICE KEY (never send to frontend)
// ─────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default supabase;