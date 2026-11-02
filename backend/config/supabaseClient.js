import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import './loadEnv.js';

dotenv.config();

// Route-contract and validation tests import services without using Storage.
// Create the client only when Storage/Auth is actually accessed so those tests
// do not require production credentials merely to load a module.
let configuredClient;
export const getSupabaseClient = () => {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !serviceKey) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required for Supabase Storage or Auth operations');
    }
    configuredClient ||= createClient(url, serviceKey);
    return configuredClient;
};

const supabase = new Proxy({}, {
    get(_target, property) {
        const client = getSupabaseClient();
        const value = client[property];
        return typeof value === 'function' ? value.bind(client) : value;
    },
});

export default supabase;
