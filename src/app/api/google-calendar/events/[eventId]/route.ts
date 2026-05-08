import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

async function refreshAccessToken(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });
  const data = await res.json();
  if (!data.access_token) return null;
  const expiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
  await supabase
    .from("google_calendar_tokens")
    .update({ access_token: data.access_token, token_expiry: expiry })
    .eq("user_id", userId);
  return data.access_token;
}

async function getAccessToken(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: tokenData } = await supabase
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", userId)
    .single();
  if (!tokenData) return null;
  if (new Date(tokenData.token_expiry) <= new Date()) {
    if (!tokenData.refresh_token) return null;
    return refreshAccessToken(supabase, userId, tokenData.refresh_token);
  }
  return tokenData.access_token;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = await getAccessToken(supabase, user.id);
  if (!accessToken) return NextResponse.json({ error: "Not connected" }, { status: 404 });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok && res.status !== 204) {
    return NextResponse.json({ error: "Failed to delete event" }, { status: res.status });
  }
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = await getAccessToken(supabase, user.id);
  if (!accessToken) return NextResponse.json({ error: "Not connected" }, { status: 404 });

  const { summary, location, start, end } = await request.json();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary,
        location,
        start: { dateTime: start },
        end: { dateTime: end },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err }, { status: res.status });
  }
  const event = await res.json();
  return NextResponse.json({ id: event.id });
}
