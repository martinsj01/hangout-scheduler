import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("first_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}!
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Your dashboard is coming soon.
        </p>
      </div>
    </div>
  );
}
