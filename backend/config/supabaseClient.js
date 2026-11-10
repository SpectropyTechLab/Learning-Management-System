import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Create Supabase client for Storage + Auth API access
const supabase = createClient(
    process.env.SUPABASE_URL,       // e.g. https://xyzcompany.supabase.co
    process.env.SUPABASE_SERVICE_KEY // from Supabase > Project Settings > API
);

export default supabase;
