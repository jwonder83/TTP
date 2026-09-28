import { createBrowserClient } from "@supabase/ssr";
import { hasSupabaseConfig, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase environment variables are missing.");
  }
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl(), supabaseKey());
  }
  return browserClient;
}
