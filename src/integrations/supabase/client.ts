import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ymcabvghfecbbbugkpow.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yCJbSd21pHp6YsfEGdP4fg_eFqvd9im";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
