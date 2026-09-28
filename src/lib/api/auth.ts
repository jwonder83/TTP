import { createClient } from "@/lib/supabase/client";

export async function signUp(input: { name: string; email: string; password: string }) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { name: input.name.trim() } },
  });
  if (error) throw error;
  return { session: data.session, user: data.user };
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await createClient().auth.signOut();
  if (error) throw error;
}

export async function currentUser() {
  const { data, error } = await createClient().auth.getUser();
  if (error) return null;
  return data.user;
}
