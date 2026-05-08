import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const GCAL_COLORS: Record<string, string> = {
  "1": "#7986cb", "2": "#33b679", "3": "#8e24aa", "4": "#e67c73",
  "5": "#f6c026", "6": "#f5511d", "7": "#039be5", "8": "#616161",
  "9": "#3f51b5", "10": "#0b8043", "11": "#d60000",
};

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

  const expiry = new Date(
    Date.now() + (data.expires_in ?? 3600) * 1000
  ).toISOString();
  await supabase
    .from("google_calendar_tokens")
    .update({ access_token: data.access_token, token_expiry: expiry })
    .eq("user_id", userId);

  return data.access_token;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: tokenData } = await supabase
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", user.id)
    .single();

  if (!tokenData) return NextResponse.json({ error: "Not connected" }, { status: 404 });

  let accessToken: string = tokenData.access_token;
  if (new Date(tokenData.token_expiry) <= new Date()) {
    if (!tokenData.refresh_token) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    const refreshed = await refreshAccessToken(supabase, user.id, tokenData.refresh_token);
    if (!refreshed) return NextResponse.json({ error: "Refresh failed" }, { status: 401 });
    accessToken = refreshed;
  }

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin") ?? new Date().toISOString();
  const timeMax = searchParams.get("timeMax") ?? new Date(Date.now() + 14 * 86400000).toISOString();

  const gcalRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    new URLSearchParams({ timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "100", fields: "items(id,summary,start,end,colorId,extendedProperties)" }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!gcalRes.ok) {
    return NextResponse.json({ error: "Google Calendar API error" }, { status: gcalRes.status });
  }

  const gcalData = await gcalRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = (gcalData.items ?? []).map((e: any) => {
    const isAppCreated = e.extendedProperties?.private?.source === "hangout-scheduler";
    return {
      id: e.id,
      summary: e.summary ?? "(No title)",
      start: e.start,
      end: e.end,
      color: isAppCreated ? "#ec4899" : e.colorId ? GCAL_COLORS[e.colorId] : "#8b5cf6",
      allDay: !e.start?.dateTime,
    };
  });

  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: tokenData } = await supabase
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", user.id)
    .single();

  if (!tokenData) return NextResponse.json({ error: "Not connected" }, { status: 404 });

  let accessToken: string = tokenData.access_token;
  if (new Date(tokenData.token_expiry) <= new Date()) {
    if (!tokenData.refresh_token) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    const refreshed = await refreshAccessToken(supabase, user.id, tokenData.refresh_token);
    if (!refreshed) return NextResponse.json({ error: "Refresh failed" }, { status: 401 });
    accessToken = refreshed;
  }

  const { summary, location, start, end } = await request.json();

  const gcalRes = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        location,
        start: { dateTime: start },
        end: { dateTime: end },
        extendedProperties: {
          private: { source: "hangout-scheduler" },
        },
      }),
    }
  );

  if (!gcalRes.ok) {
    const err = await gcalRes.json();
    return NextResponse.json({ error: err }, { status: gcalRes.status });
  }

  const event = await gcalRes.json();
  return NextResponse.json({ id: event.id, htmlLink: event.htmlLink });
}
