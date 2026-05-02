"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Profile {
  id: string;
  first_name: string;
  username: string;
  profile_photo_url: string | null;
}

interface Friend {
  id: string;
  first_name: string;
  username: string;
  profile_photo_url: string | null;
}

interface Interest {
  id: string;
  title: string;
}

interface Hang {
  id: string;
  proposed_datetime: string;
  message: string | null;
  location: string | null;
  description: string | null;
  interest: { title: string } | null;
  friend: { first_name: string; username: string; profile_photo_url: string | null } | null;
}

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface UserSearchResult {
  id: string;
  first_name: string;
  username: string;
  profile_photo_url: string | null;
}

interface FriendRequest {
  id: string;
  user_id: string;
  first_name: string;
  username: string;
}

interface HangoutRequest {
  id: string;
  sender_user_id: string;
  first_name: string;
  username: string;
  proposed_datetime: string;
  message: string | null;
  location: string | null;
  interest_title: string | null;
}

function SlotDigit({ target, delay }: { target: number; delay: number }) {
  const [display, setDisplay] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const startTime = Date.now() + delay;
    const duration = 900;
    let raf: number;
    let lastFlip = 0;
    const flipInterval = 120;

    const tick = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (elapsed >= duration) {
        setDisplay(target);
        setSettled(true);
        return;
      }
      if (now - lastFlip >= flipInterval) {
        setDisplay(Math.floor(Math.random() * 10));
        lastFlip = now;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delay]);

  return (
    <span
      className={`inline-block tabular-nums transition-opacity duration-300 ${
        settled ? "opacity-100" : "opacity-70"
      }`}
    >
      {display}
    </span>
  );
}

function IntroAnimation({ loading }: { loading: boolean }) {
  const TARGET = 546;
  const digits = String(TARGET).split("").map(Number);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Start fade-out near the end of the animation
      const timer = setTimeout(() => setFadeOut(true), 1400);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center bg-black transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex items-baseline gap-1">
        <span className="text-7xl font-extralight tracking-tight text-white sm:text-8xl">
          {loading ? (
            <span className="opacity-30">...</span>
          ) : (
            digits.map((d, i) => (
              <SlotDigit key={i} target={d} delay={i * 200} />
            ))
          )}
        </span>
      </div>
      <p className="mt-4 text-lg font-light tracking-widest text-white/60 uppercase">
        Hangs Scheduled
      </p>
    </div>
  );
}

const HANGOUT_IDEAS = [
  { emoji: "⚽", title: "Soccer at Pier 40", location: "Pier 40, Hudson River Park", hasOffer: false },
  { emoji: "☕", title: "New Coffee Shop in SoHo", location: "SoHo, Manhattan", hasOffer: true },
  { emoji: "🛁", title: "Wall St Baths", location: "Wall Street Bath & Spa", hasOffer: false },
  { emoji: "🍕", title: "Pizza Night in LES", location: "Lower East Side", hasOffer: true },
  { emoji: "🎭", title: "Comedy Show", location: "Village Vanguard", hasOffer: true },
  { emoji: "🏃", title: "Morning Run", location: "Central Park", hasOffer: false },
];

function getTimeSuggestions() {
  const now = new Date();
  const suggestions: { label: string; sublabel: string; datetime: string }[] = [];

  const tonight = new Date(now);
  tonight.setHours(18, 0, 0, 0);
  if (now.getHours() < 17) {
    suggestions.push({ label: "Tonight", sublabel: "After work · 6pm", datetime: tonight.toISOString() });
  }

  const daysUntilFri = ((5 - now.getDay()) + 7) % 7 || 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFri);
  friday.setHours(19, 0, 0, 0);
  suggestions.push({
    label: "Friday",
    sublabel: friday.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · 7pm",
    datetime: friday.toISOString(),
  });

  const daysUntilSat = ((6 - now.getDay()) + 7) % 7 || 7;
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + daysUntilSat);
  saturday.setHours(14, 0, 0, 0);
  suggestions.push({
    label: "Saturday",
    sublabel: saturday.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · 2pm",
    datetime: saturday.toISOString(),
  });

  const daysUntilSun = ((7 - now.getDay()) + 7) % 7 || 7;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysUntilSun);
  sunday.setHours(11, 0, 0, 0);
  suggestions.push({
    label: "Sunday",
    sublabel: sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · 11am",
    datetime: sunday.toISOString(),
  });

  return suggestions;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabaseRef = useRef<SupabaseClient | null>(null);
  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }

  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [hangs, setHangs] = useState<Hang[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [showFriends, setShowFriends] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [calendarView, setCalendarView] = useState<"3day" | "2week" | "month">("2week");
  const [calendarAnchor, setCalendarAnchor] = useState<Date>(new Date());
  const [selectedCells, setSelectedCells] = useState<{ dow: number; hour: number; colIdx: number }[]>([]);
  const [dragStart, setDragStart] = useState<{ dow: number; hour: number; colIdx: number } | null>(null);
  const isDragging = useRef(false);

  // Friend search state
  const [friendSearch, setFriendSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [addedFriends, setAddedFriends] = useState<Set<string>>(new Set());
  const [friendErrors, setFriendErrors] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);

  // Interest add state
  const [interestInput, setInterestInput] = useState("");

  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [hangoutRequests, setHangoutRequests] = useState<HangoutRequest[]>([]);

  // Schedule hangout state
  const [showAvailability, setShowAvailability] = useState(false);
  const [showScheduleHangout, setShowScheduleHangout] = useState(false);
  const [scheduleSelectedFriendIds, setScheduleSelectedFriendIds] = useState<string[]>([]);
  const [scheduleSelectedTime, setScheduleSelectedTime] = useState<{ label: string; sublabel: string; datetime: string } | null>(null);
  const [scheduleSelectedIdea, setScheduleSelectedIdea] = useState<{ emoji: string; title: string; location: string } | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("users")
        .select("first_name, username, profile_photo_url")
        .eq("id", user.id)
        .single();

      if (!profileData) {
        router.push("/onboarding");
        return;
      }
      setProfile({ id: user.id, ...profileData });

      // Fetch accepted friends
      const { data: friendRows } = await supabase
        .from("friends")
        .select("user_id, friend_user_id")
        .or(`user_id.eq.${user.id},friend_user_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (friendRows && friendRows.length > 0) {
        const friendIds = friendRows.map((r) =>
          r.user_id === user.id ? r.friend_user_id : r.user_id
        );
        const { data: friendProfiles } = await supabase
          .from("users")
          .select("id, first_name, username, profile_photo_url")
          .in("id", friendIds);
        setFriends((friendProfiles as Friend[]) || []);
      }

      // Fetch interests
      const { data: interestData } = await supabase
        .from("interests")
        .select("id, title")
        .eq("user_id", user.id);
      setInterests((interestData as Interest[]) || []);

      // Fetch availability
      const { data: availData } = await supabase
        .from("availability")
        .select("id, day_of_week, start_time, end_time")
        .eq("user_id", user.id);
      setAvailability((availData as Availability[]) || []);

      // Fetch upcoming accepted hangs
      const { data: sentHangs } = await supabase
        .from("hangout_suggestions")
        .select("id, proposed_datetime, message, location, description, interest_id, recipient_user_id")
        .eq("sender_user_id", user.id)
        .eq("status", "accepted")
        .gte("proposed_datetime", new Date().toISOString())
        .order("proposed_datetime", { ascending: true });

      const { data: receivedHangs } = await supabase
        .from("hangout_suggestions")
        .select("id, proposed_datetime, message, location, description, interest_id, sender_user_id")
        .eq("recipient_user_id", user.id)
        .eq("status", "accepted")
        .gte("proposed_datetime", new Date().toISOString())
        .order("proposed_datetime", { ascending: true });

      const allHangRows = [...(sentHangs || []), ...(receivedHangs || [])];
      const hangList: Hang[] = [];
      for (const h of allHangRows) {
        let interest: { title: string } | null = null;
        if (h.interest_id) {
          const { data: intData } = await supabase
            .from("interests")
            .select("title")
            .eq("id", h.interest_id)
            .single();
          interest = intData;
        }
        const friendId = "recipient_user_id" in h ? h.recipient_user_id : h.sender_user_id;
        let friend: { first_name: string; username: string; profile_photo_url: string | null } | null = null;
        if (friendId) {
          const { data: fData } = await supabase
            .from("users")
            .select("first_name, username, profile_photo_url")
            .eq("id", friendId)
            .single();
          friend = fData as { first_name: string; username: string; profile_photo_url: string | null } | null;
        }
        hangList.push({
          id: h.id,
          proposed_datetime: h.proposed_datetime,
          message: h.message,
          location: h.location,
          description: h.description,
          interest,
          friend,
        });
      }
      hangList.sort((a, b) => new Date(a.proposed_datetime).getTime() - new Date(b.proposed_datetime).getTime());
      setHangs(hangList);

      // Fetch incoming friend requests (where I'm the recipient)
      const { data: pendingFriendRows } = await supabase
        .from("friends")
        .select("id, user_id")
        .eq("friend_user_id", user.id)
        .eq("status", "pending");

      if (pendingFriendRows && pendingFriendRows.length > 0) {
        const senderIds = pendingFriendRows.map((r) => r.user_id);
        const { data: senderProfiles } = await supabase
          .from("users")
          .select("id, first_name, username")
          .in("id", senderIds);
        const frList: FriendRequest[] = pendingFriendRows.map((r) => {
          const sender = senderProfiles?.find((p) => p.id === r.user_id);
          return {
            id: r.id,
            user_id: r.user_id,
            first_name: sender?.first_name || "Unknown",
            username: sender?.username || "unknown",
          };
        });
        setFriendRequests(frList);
      }

      // Fetch incoming hangout requests
      const { data: pendingHangoutRows } = await supabase
        .from("hangout_suggestions")
        .select("id, sender_user_id, proposed_datetime, message, location, interest_id")
        .eq("recipient_user_id", user.id)
        .eq("status", "pending");

      if (pendingHangoutRows && pendingHangoutRows.length > 0) {
        const hangoutSenderIds = [...new Set(pendingHangoutRows.map((r) => r.sender_user_id))];
        const { data: hangoutSenderProfiles } = await supabase
          .from("users")
          .select("id, first_name, username")
          .in("id", hangoutSenderIds);
        const hrList: HangoutRequest[] = [];
        for (const r of pendingHangoutRows) {
          const sender = hangoutSenderProfiles?.find((p) => p.id === r.sender_user_id);
          let interestTitle: string | null = null;
          if (r.interest_id) {
            const { data: intData } = await supabase
              .from("interests")
              .select("title")
              .eq("id", r.interest_id)
              .single();
            interestTitle = intData?.title || null;
          }
          hrList.push({
            id: r.id,
            sender_user_id: r.sender_user_id,
            first_name: sender?.first_name || "Unknown",
            username: sender?.username || "unknown",
            proposed_datetime: r.proposed_datetime,
            message: r.message,
            location: r.location,
            interest_title: interestTitle,
          });
        }
        setHangoutRequests(hrList);
      }

      setLoading(false);
    }
    fetchData();
  }, [router]);

  // Debounced friend search
  useEffect(() => {
    if (!friendSearch.trim() || !profile) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const supabase = getSupabase();
      const query = `%${friendSearch.trim()}%`;
      const { data } = await supabase
        .from("users")
        .select("id, first_name, username, profile_photo_url")
        .or(`first_name.ilike.${query},username.ilike.${query}`)
        .neq("id", profile.id)
        .limit(10);
      setSearchResults((data as UserSearchResult[]) || []);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [friendSearch, profile]);

  const handleAddFriend = async (friendId: string) => {
    if (!profile) return;
    setFriendErrors((prev) => { const next = { ...prev }; delete next[friendId]; return next; });
    const supabase = getSupabase();
    const { error } = await supabase.from("friends").insert({
      user_id: profile.id,
      friend_user_id: friendId,
      status: "pending",
    });
    if (error) {
      setFriendErrors((prev) => ({ ...prev, [friendId]: error.message }));
    } else {
      setAddedFriends((prev) => new Set(prev).add(friendId));
    }
  };

  const handleAddInterest = async () => {
    const trimmed = interestInput.trim();
    if (!trimmed || !profile) return;
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("interests")
      .insert({ user_id: profile.id, title: trimmed })
      .select("id, title")
      .single();
    if (!error && data) {
      setInterests((prev) => [...prev, data as Interest]);
    }
    setInterestInput("");
  };

  const handleRemoveInterest = async (interestId: string) => {
    if (!profile) return;
    const supabase = getSupabase();
    const { error } = await supabase.from("interests").delete().eq("id", interestId);
    if (!error) {
      setInterests((prev) => prev.filter((i) => i.id !== interestId));
    }
  };

  // Notification handlers
  const handleAcceptFriend = async (requestId: string) => {
    const supabase = getSupabase();
    await supabase.from("friends").update({ status: "accepted" }).eq("id", requestId);
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    // Refresh friends list
    if (profile) {
      const { data: friendRows } = await supabase
        .from("friends")
        .select("user_id, friend_user_id")
        .or(`user_id.eq.${profile.id},friend_user_id.eq.${profile.id}`)
        .eq("status", "accepted");
      if (friendRows && friendRows.length > 0) {
        const friendIds = friendRows.map((r) =>
          r.user_id === profile.id ? r.friend_user_id : r.user_id
        );
        const { data: friendProfiles } = await supabase
          .from("users")
          .select("id, first_name, username, profile_photo_url")
          .in("id", friendIds);
        setFriends((friendProfiles as Friend[]) || []);
      }
    }
  };

  const handleDeclineFriend = async (requestId: string) => {
    const supabase = getSupabase();
    await supabase.from("friends").delete().eq("id", requestId);
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleAcceptHangout = async (requestId: string) => {
    const supabase = getSupabase();
    await supabase.from("hangout_suggestions").update({ status: "accepted" }).eq("id", requestId);
    setHangoutRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleDeclineHangout = async (requestId: string) => {
    const supabase = getSupabase();
    await supabase.from("hangout_suggestions").update({ status: "declined" }).eq("id", requestId);
    setHangoutRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const toggleScheduleFriend = (friendId: string) => {
    setScheduleSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  // Schedule hangout handler
  const handleScheduleHangout = async () => {
    if (!profile) return;
    if (scheduleSelectedFriendIds.length === 0 || !scheduleSelectedTime || !scheduleSelectedIdea) {
      setScheduleError("Select a friend, time, and hangout idea.");
      return;
    }
    setScheduleError(null);
    setScheduling(true);
    const supabase = getSupabase();
    for (const friendId of scheduleSelectedFriendIds) {
      const { error } = await supabase.from("hangout_suggestions").insert({
        sender_user_id: profile.id,
        recipient_user_id: friendId,
        interest_id: null,
        proposed_datetime: scheduleSelectedTime.datetime,
        location: scheduleSelectedIdea.location,
        description: scheduleSelectedIdea.title,
        message: null,
        status: "pending",
      });
      if (error) {
        setScheduleError(error.message);
        setScheduling(false);
        return;
      }
    }
    setScheduling(false);
    setShowScheduleHangout(false);
    setScheduleSelectedFriendIds([]);
    setScheduleSelectedTime(null);
    setScheduleSelectedIdea(null);
  };

  const notificationCount = friendRequests.length + hangoutRequests.length;

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM – 9 PM (last slot is 9–10 PM)

  const isCellAvailable = (day: number, hour: number): Availability | null => {
    const hourStr = `${hour.toString().padStart(2, "0")}:00:00`;
    const nextHourStr = `${(hour + 1).toString().padStart(2, "0")}:00:00`;
    return (
      availability.find(
        (a) =>
          a.day_of_week === day &&
          a.start_time <= hourStr &&
          a.end_time >= nextHourStr
      ) || null
    );
  };

  const buildRange = (
    start: { dow: number; hour: number; colIdx: number },
    end: { dow: number; hour: number; colIdx: number }
  ) => {
    if (start.colIdx !== end.colIdx) return [start];
    const minH = Math.min(start.hour, end.hour);
    const maxH = Math.max(start.hour, end.hour);
    const cells: { dow: number; hour: number; colIdx: number }[] = [];
    for (let h = minH; h <= maxH; h++) {
      cells.push({ dow: start.dow, hour: h, colIdx: start.colIdx });
    }
    return cells;
  };

  const isCellSelected = (dow: number, hour: number, colIdx: number) =>
    selectedCells.some((c) => c.dow === dow && c.hour === hour && c.colIdx === colIdx);

  const handlePointerDown = (day: number, hour: number, colIdx: number) => {
    isDragging.current = true;
    const cell = { dow: day, hour, colIdx };
    setDragStart(cell);
    setSelectedCells([cell]);
  };

  const handleGridPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !dragStart) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (!el) return;
    const dow = el.dataset.dow;
    const hour = el.dataset.hour;
    const col = el.dataset.col;
    if (dow == null || hour == null || col == null) return;
    setSelectedCells(buildRange(dragStart, { dow: +dow, hour: +hour, colIdx: +col }));
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    setDragStart(null);
  };

  // Global pointerup to end drag even if pointer leaves the grid
  useEffect(() => {
    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setDragStart(null);
      }
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, []);

  const handleToggleAvailability = async () => {
    if (!profile || selectedCells.length === 0) return;
    const supabase = getSupabase();

    // Determine action: if ALL selected cells are available, remove; otherwise add
    const allAvailable = selectedCells.every((c) => isCellAvailable(c.dow, c.hour));

    for (const cell of selectedCells) {
      const hourStr = `${cell.hour.toString().padStart(2, "0")}:00:00`;
      const nextHourStr = `${(cell.hour + 1).toString().padStart(2, "0")}:00:00`;
      const matchingAvail = isCellAvailable(cell.dow, cell.hour);

      if (allAvailable && matchingAvail) {
        const { error } = await supabase
          .from("availability")
          .delete()
          .eq("id", matchingAvail.id);
        if (error) continue;

        const newRows: Availability[] = [];
        if (matchingAvail.start_time < hourStr) {
          const { data } = await supabase
            .from("availability")
            .insert({
              user_id: profile.id,
              day_of_week: cell.dow,
              start_time: matchingAvail.start_time,
              end_time: hourStr,
            })
            .select("id, day_of_week, start_time, end_time")
            .single();
          if (data) newRows.push(data as Availability);
        }
        if (matchingAvail.end_time > nextHourStr) {
          const { data } = await supabase
            .from("availability")
            .insert({
              user_id: profile.id,
              day_of_week: cell.dow,
              start_time: nextHourStr,
              end_time: matchingAvail.end_time,
            })
            .select("id, day_of_week, start_time, end_time")
            .single();
          if (data) newRows.push(data as Availability);
        }

        setAvailability((prev) =>
          [...prev.filter((a) => a.id !== matchingAvail.id), ...newRows]
        );
      } else if (!allAvailable && !matchingAvail) {
        const { data, error } = await supabase
          .from("availability")
          .insert({
            user_id: profile.id,
            day_of_week: cell.dow,
            start_time: hourStr,
            end_time: nextHourStr,
          })
          .select("id, day_of_week, start_time, end_time")
          .single();
        if (!error && data) {
          setAvailability((prev) => [...prev, data as Availability]);
        }
      }
    }
    setSelectedCells([]);
  };

  const formatHour = (h: number) => {
    if (h === 0 || h === 12) return `${h === 0 ? 12 : 12} ${h < 12 ? "AM" : "PM"}`;
    return `${h > 12 ? h - 12 : h} ${h < 12 ? "AM" : "PM"}`;
  };

  // Intro animation: dismiss after slot machine finishes
  useEffect(() => {
    if (!loading && showIntro) {
      const timer = setTimeout(() => setShowIntro(false), 1900);
      return () => clearTimeout(timer);
    }
  }, [loading, showIntro]);

  const inputClass =
    "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  if (loading || showIntro) {
    return <IntroAnimation loading={loading} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {profile?.profile_photo_url ? (
              <img
                src={profile.profile_photo_url}
                alt=""
                className="h-16 w-16 rounded-full"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-xl font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {profile?.first_name?.[0] || "?"}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Welcome, {profile?.first_name}!
              </h1>
              <p className="text-zinc-500">@{profile?.username}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications Panel */}
        {showNotifications && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Notifications</h3>
            {friendRequests.length === 0 && hangoutRequests.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No new notifications.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {friendRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {req.first_name} (@{req.username})
                      </p>
                      <p className="text-xs text-zinc-500">wants to be your friend</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptFriend(req.id)}
                        className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineFriend(req.id)}
                        className="rounded-md bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
                {hangoutRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {req.first_name} (@{req.username})
                      </p>
                      <p className="text-xs text-zinc-500">
                        invited you to hang out
                        {req.interest_title && <> - {req.interest_title}</>}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {new Date(req.proposed_datetime).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {req.location && <> at {req.location}</>}
                      </p>
                      {req.message && (
                        <p className="mt-1 text-xs text-zinc-500 italic">&quot;{req.message}&quot;</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptHangout(req.id)}
                        className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineHangout(req.id)}
                        className="rounded-md bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          {/* Friends Card */}
          <button
            onClick={() => { setShowFriends(!showFriends); setShowInterests(false); }}
            className="rounded-xl border border-zinc-200 bg-white p-6 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {friends.length}
            </p>
            <p className="text-sm text-zinc-500">Friends</p>
          </button>

          {/* Interests Card */}
          <button
            onClick={() => { setShowInterests(!showInterests); setShowFriends(false); }}
            className="rounded-xl border border-zinc-200 bg-white p-6 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {interests.length}
            </p>
            <p className="text-sm text-zinc-500">Interests</p>
          </button>
        </div>

        {/* Expanded Friends */}
        {showFriends && (
          <div className="mt-4 space-y-3">
            {/* Friend search */}
            <input
              type="text"
              placeholder="Search for new friends..."
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              className={inputClass}
            />
            {searching && <p className="text-sm text-zinc-500">Searching...</p>}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      {user.profile_photo_url ? (
                        <img src={user.profile_photo_url} alt="" className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {user.first_name[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.first_name}</p>
                        <p className="text-xs text-zinc-500">@{user.username}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {addedFriends.has(user.id) ? (
                        <span className="text-sm text-green-600">Added</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddFriend(user.id)}
                          className="rounded-md bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                          Add
                        </button>
                      )}
                      {friendErrors[user.id] && (
                        <p className="text-xs text-red-500">{friendErrors[user.id]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {friendSearch && !searching && searchResults.length === 0 && (
              <p className="text-sm text-zinc-500">No users found.</p>
            )}
            {/* Existing friends list */}
            {friends.length > 0 && (
              <>
                {friendSearch && <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Your Friends</p>}
                {friends.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    {f.profile_photo_url ? (
                      <img src={f.profile_photo_url} alt="" className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {f.first_name[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {f.first_name}
                      </p>
                      <p className="text-xs text-zinc-500">@{f.username}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Expanded Interests */}
        {showInterests && (
          <div className="mt-4 space-y-3">
            {/* Add interest input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a new interest..."
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInterest();
                  }
                }}
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleAddInterest}
                className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Add
              </button>
            </div>
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <span
                    key={interest.id}
                    className="group relative rounded-full bg-zinc-200 px-3 py-1 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {interest.title}
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(interest.id)}
                      className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] leading-none text-white group-hover:flex"
                    >
                      X
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Hangs */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Upcoming Hangs
          </h2>
          {hangs.length === 0 ? (
            <p className="mt-4 text-zinc-400">Nothing yet — schedule one below!</p>
          ) : (
            <div className="mt-4 space-y-3">
              {hangs.map((hang) => {
                const title = hang.description || hang.interest?.title || "Hangout";
                const hangDate = new Date(hang.proposed_datetime);
                const dayLabel = hangDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                const timeLabel = hangDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                return (
                  <div key={hang.id} className="rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
                          {title}
                        </p>
                        {hang.friend && (
                          <div className="mt-2 flex items-center gap-2">
                            {hang.friend.profile_photo_url ? (
                              <img src={hang.friend.profile_photo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                            ) : (
                              <div className="h-5 w-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-semibold text-zinc-500">
                                {hang.friend.first_name[0]}
                              </div>
                            )}
                            <p className="text-sm text-zinc-500">{hang.friend.first_name}</p>
                          </div>
                        )}
                        {hang.location && (
                          <p className="mt-1.5 text-xs text-zinc-400">{hang.location}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{dayLabel}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{timeLabel}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Plan a Hang */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Plan a Hang</h2>
            {showScheduleHangout && (
              <button
                type="button"
                onClick={() => { setShowScheduleHangout(false); setScheduleSelectedFriendIds([]); setScheduleSelectedTime(null); setScheduleSelectedIdea(null); setScheduleError(null); }}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                </svg>
              </button>
            )}
          </div>

          {!showScheduleHangout ? (
            <>
              {/* Friends preview row */}
              {friends.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar mb-4">
                  {friends.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => { toggleScheduleFriend(f.id); setShowScheduleHangout(true); }}
                      className="flex flex-col items-center gap-1 flex-shrink-0"
                    >
                      {f.profile_photo_url ? (
                        <img src={f.profile_photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                          {f.first_name[0]}
                        </div>
                      )}
                      <span className="text-xs text-zinc-500">{f.first_name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Hang ideas preview */}
              <div className="grid grid-cols-2 gap-3">
                {HANGOUT_IDEAS.map((idea) => (
                  <button
                    key={idea.title}
                    type="button"
                    onClick={() => { setScheduleSelectedIdea(idea); setShowScheduleHangout(true); }}
                    className="relative rounded-2xl bg-white dark:bg-zinc-900 p-4 text-left shadow-sm hover:shadow-md transition-shadow"
                  >
                    {idea.hasOffer && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute top-3 right-3 h-4 w-4 text-zinc-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                      </svg>
                    )}
                    <span className="text-2xl mb-2 block">{idea.emoji}</span>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">{idea.title}</p>
                    <p className="text-xs text-zinc-400 mt-1">{idea.location}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-lg">
              {/* Who */}
              <div className="mb-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-3">Who</p>
                {friends.length === 0 ? (
                  <p className="text-sm text-zinc-400">Add friends first to invite them.</p>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
                    {friends.map((f) => {
                      const selected = scheduleSelectedFriendIds.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleScheduleFriend(f.id)}
                          className="flex flex-col items-center gap-1.5 flex-shrink-0 transition-all"
                        >
                          <div className={`relative rounded-full ring-2 ring-offset-2 transition-all ${selected ? "ring-zinc-900 dark:ring-zinc-100 ring-offset-white dark:ring-offset-zinc-900" : "ring-transparent"}`}>
                            {f.profile_photo_url ? (
                              <img src={f.profile_photo_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                            ) : (
                              <div className="h-14 w-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg font-semibold text-zinc-600 dark:text-zinc-400">
                                {f.first_name[0]}
                              </div>
                            )}
                            {selected && (
                              <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shadow">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-white dark:text-zinc-900">
                                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <span className={`text-xs font-medium transition-colors ${selected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}`}>
                            {f.first_name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* When */}
              <div className="mb-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-3">When</p>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {getTimeSuggestions().map((slot) => {
                    const selected = scheduleSelectedTime?.datetime === slot.datetime;
                    return (
                      <button
                        key={slot.datetime}
                        type="button"
                        onClick={() => setScheduleSelectedTime(selected ? null : slot)}
                        className={`flex-shrink-0 rounded-2xl px-4 py-3 text-left transition-all ${
                          selected ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        }`}
                      >
                        <p className={`text-sm font-semibold ${selected ? "text-white dark:text-zinc-900" : "text-zinc-800 dark:text-zinc-200"}`}>{slot.label}</p>
                        <p className={`text-xs mt-0.5 ${selected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400"}`}>{slot.sublabel}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hang ideas */}
              <div className="mb-7">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-3">Pick a hang</p>
                <div className="grid grid-cols-2 gap-3">
                  {HANGOUT_IDEAS.map((idea) => {
                    const selected = scheduleSelectedIdea?.title === idea.title;
                    const dateLabel = scheduleSelectedTime?.sublabel ?? "Pick a time";
                    return (
                      <button
                        key={idea.title}
                        type="button"
                        onClick={() => setScheduleSelectedIdea(selected ? null : idea)}
                        className={`relative rounded-2xl p-4 text-left transition-all ${
                          selected
                            ? "bg-zinc-900 dark:bg-zinc-100 ring-2 ring-zinc-900 dark:ring-zinc-100"
                            : "bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {idea.hasOffer && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`absolute top-3 right-3 h-4 w-4 ${selected ? "text-zinc-500 dark:text-zinc-500" : "text-zinc-400"}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                          </svg>
                        )}
                        <span className="text-2xl mb-2.5 block">{idea.emoji}</span>
                        <p className={`text-sm font-semibold leading-snug ${selected ? "text-white dark:text-zinc-900" : "text-zinc-900 dark:text-zinc-100"}`}>{idea.title}</p>
                        <p className={`text-xs mt-1 ${selected ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-400"}`}>{idea.location}</p>
                        <p className={`text-xs mt-0.5 ${selected ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-400"}`}>{dateLabel}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {scheduleError && <p className="text-sm text-red-500 mb-4">{scheduleError}</p>}

              <button
                type="button"
                onClick={handleScheduleHangout}
                disabled={scheduling || scheduleSelectedFriendIds.length === 0 || !scheduleSelectedTime || !scheduleSelectedIdea}
                className="w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-25 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all"
              >
                {scheduling ? "Sending…" : "Send Invitation"}
              </button>
            </div>
          )}
        </div>

        {/* Availability Calendar */}
        <div className="mt-8 pb-8">
          <button
            type="button"
            onClick={() => setShowAvailability(!showAvailability)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Availability</h2>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`h-5 w-5 text-zinc-400 transition-transform duration-200 ${showAvailability ? "rotate-180" : ""}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {showAvailability && (
            <div>
              <div className="mt-4 flex justify-end">
                <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700">
                  {([["3day", "3 Day"], ["2week", "2 Week"], ["month", "Month"]] as const).map(
                    ([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setCalendarView(value);
                          setSelectedCells([]);
                          if (value !== "3day") setCalendarAnchor(new Date());
                        }}
                        className={`px-3 py-1 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                          calendarView === value
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                        }`}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {selectedCells.length > 0 && (() => {
                const sorted = [...selectedCells].sort((a, b) => a.hour - b.hour);
                const first = sorted[0];
                const last = sorted[sorted.length - 1];
                const allAvailable = sorted.every((c) => isCellAvailable(c.dow, c.hour));
                const allUnavailable = sorted.every((c) => !isCellAvailable(c.dow, c.hour));
                const statusLabel = allAvailable ? "Available" : allUnavailable ? "Unavailable" : "Mixed";
                const dotColor = allAvailable
                  ? "bg-emerald-400"
                  : allUnavailable
                  ? "bg-zinc-300 dark:bg-zinc-600"
                  : "bg-amber-400";
                return (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="flex items-center gap-3">
                      <span className={`inline-block h-3 w-3 rounded-full ${dotColor}`} />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {DAYS[first.dow]} {formatHour(first.hour)} – {formatHour(last.hour + 1)}
                        {sorted.length > 1 && (
                          <span className="ml-1 text-xs text-zinc-400">({sorted.length} hrs)</span>
                        )}
                        <span className="ml-2 text-xs text-zinc-400">{statusLabel}</span>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCells([])}
                        className="rounded-md px-3 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleAvailability}
                        className={`rounded-md px-3 py-1 text-xs font-medium text-white transition-colors ${
                          allAvailable ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"
                        }`}
                      >
                        {allAvailable ? "Remove availability" : "Add availability"}
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="mt-4 overflow-x-auto">
                {calendarView === "month" ? (
                  (() => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = today.getMonth();
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const monthName = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });
                    const hasAvailability = (dayOfWeek: number) =>
                      availability.some((a) => a.day_of_week === dayOfWeek);
                    const cells: (number | null)[] = [];
                    for (let i = 0; i < firstDay; i++) cells.push(null);
                    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                    while (cells.length % 7 !== 0) cells.push(null);
                    return (
                      <div>
                        <p className="mb-2 text-center text-sm font-medium text-zinc-500">{monthName}</p>
                        <div className="grid grid-cols-7 gap-1">
                          {DAYS.map((day) => (
                            <div key={day} className="py-1 text-center text-xs font-medium text-zinc-500">
                              {day}
                            </div>
                          ))}
                          {cells.map((date, idx) => {
                            if (date === null) return <div key={`empty-${idx}`} />;
                            const dow = new Date(year, month, date).getDay();
                            const hasAvail = hasAvailability(dow);
                            const isToday = date === today.getDate() && month === today.getMonth();
                            return (
                              <button
                                key={date}
                                type="button"
                                onClick={() => {
                                  const clickedDate = new Date(year, month, date);
                                  const anchor = new Date(clickedDate);
                                  anchor.setDate(anchor.getDate() - 1);
                                  setCalendarAnchor(anchor);
                                  setCalendarView("3day");
                                  setSelectedCells([]);
                                }}
                                className={`flex h-8 items-center justify-center rounded-md text-xs transition-colors ${
                                  hasAvail
                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                } ${isToday ? "ring-2 ring-indigo-400 dark:ring-indigo-500" : ""}`}
                              >
                                {date}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  (() => {
                    const anchor = calendarAnchor;
                    let dayColumns: { label: string; dow: number; date: Date }[];
                    if (calendarView === "3day") {
                      dayColumns = Array.from({ length: 3 }, (_, i) => {
                        const d = new Date(anchor);
                        d.setDate(d.getDate() + i);
                        return {
                          label: d.toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" }),
                          dow: d.getDay(),
                          date: d,
                        };
                      });
                    } else {
                      dayColumns = Array.from({ length: 14 }, (_, i) => {
                        const d = new Date(anchor);
                        d.setDate(d.getDate() + i);
                        return {
                          label: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
                          dow: d.getDay(),
                          date: d,
                        };
                      });
                    }
                    const colCount = dayColumns.length;
                    const relevantHoursSet = new Set<number>();
                    for (const col of dayColumns) {
                      for (const a of availability) {
                        if (a.day_of_week === col.dow) {
                          const startH = parseInt(a.start_time.split(":")[0], 10);
                          const endH = parseInt(a.end_time.split(":")[0], 10);
                          const endMin = parseInt(a.end_time.split(":")[1], 10);
                          const effectiveEnd = endMin > 0 ? endH + 1 : endH;
                          for (let h = startH; h < effectiveEnd; h++) relevantHoursSet.add(h);
                        }
                      }
                      const colDateStr = col.date.toDateString();
                      for (const hang of hangs) {
                        const hangDate = new Date(hang.proposed_datetime);
                        if (hangDate.toDateString() === colDateStr) relevantHoursSet.add(hangDate.getHours());
                      }
                    }
                    const visibleHours = relevantHoursSet.size === 0
                      ? HOURS
                      : [...relevantHoursSet].sort((a, b) => a - b);
                    return (
                      <div
                        className="grid gap-px"
                        style={{ gridTemplateColumns: `auto repeat(${colCount}, 1fr)` }}
                        onPointerMove={handleGridPointerMove}
                        onPointerUp={handlePointerUp}
                      >
                        <div />
                        {dayColumns.map((col, i) => {
                          const isToday = col.date.toDateString() === new Date().toDateString();
                          return (
                            <div key={i} className={`py-1 text-center text-xs font-medium truncate ${isToday ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500"}`}>
                              {col.label}
                            </div>
                          );
                        })}
                        {visibleHours.map((hour) => (
                          <React.Fragment key={`row-${hour}`}>
                            <div className="pr-2 text-right text-[10px] leading-6 text-zinc-400">
                              {formatHour(hour)}
                            </div>
                            {dayColumns.map((col, i) => {
                              const avail = isCellAvailable(col.dow, hour);
                              const isSelected = isCellSelected(col.dow, hour, i);
                              return (
                                <button
                                  key={`${i}-${hour}`}
                                  type="button"
                                  data-dow={col.dow}
                                  data-hour={hour}
                                  data-col={i}
                                  onPointerDown={(e) => { e.preventDefault(); handlePointerDown(col.dow, hour, i); }}
                                  draggable={false}
                                  className={`h-8 rounded-sm border transition-colors select-none touch-none ${
                                    isSelected ? "border-indigo-500 ring-2 ring-indigo-400 dark:ring-indigo-500" : ""
                                  } ${
                                    avail
                                      ? `bg-emerald-200 hover:bg-emerald-300 dark:bg-emerald-700/50 dark:hover:bg-emerald-700/70 ${isSelected ? "" : "border-emerald-300 dark:border-emerald-600/50"}`
                                      : `bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 ${isSelected ? "" : "border-zinc-200 dark:border-zinc-700"}`
                                  }`}
                                />
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
