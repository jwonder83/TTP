import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseConfig, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

export async function createClient() {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase environment variables are missing.");
  }
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabaseKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        void headers;
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. Middleware refreshes the session.
        }
      },
    },
  });
}
