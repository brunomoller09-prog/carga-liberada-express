import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

export const listCargoReleases = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<{ unlocked?: boolean }>({
    password: process.env.SESSION_SECRET!,
    name: "historico-gate",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  });
  if (session.data.unlocked !== true) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("cargo_releases" as never)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown[] };
});