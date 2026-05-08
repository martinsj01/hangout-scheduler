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

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  color: string;
  allDay: boolean;
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
  // Outdoors
  { emoji: "🌅", title: "Sunset at Brooklyn Bridge Park", location: "DUMBO, Brooklyn", hasOffer: false, category: "Outdoors", trending: true },
  { emoji: "🚲", title: "Bike Central Park", location: "Central Park, Manhattan", hasOffer: false, category: "Outdoors", trending: true },
  { emoji: "🌿", title: "Walk the High Line", location: "Chelsea, Manhattan", hasOffer: false, category: "Outdoors", trending: false },
  { emoji: "🏝️", title: "Governor's Island", location: "New York Harbor", hasOffer: false, category: "Outdoors", trending: false },
  { emoji: "🌸", title: "Brooklyn Botanical Gardens", location: "Prospect Heights, Brooklyn", hasOffer: false, category: "Outdoors", trending: false },
  { emoji: "🌺", title: "NY Botanical Garden", location: "Bronx, New York", hasOffer: false, category: "Outdoors", trending: false },
  { emoji: "🏄", title: "Rockaway Beach", location: "Rockaway Beach, Queens", hasOffer: false, category: "Outdoors", trending: false },
  { emoji: "🏃", title: "Morning Run", location: "Central Park", hasOffer: false, category: "Outdoors", trending: false },
  // Food & Drink
  { emoji: "🍜", title: "Smorgasburg", location: "Prospect Park, Brooklyn", hasOffer: false, category: "Food & Drink", trending: true },
  { emoji: "🥂", title: "Brunch in the West Village", location: "West Village, Manhattan", hasOffer: true, category: "Food & Drink", trending: false },
  { emoji: "🍕", title: "Pizza Night in LES", location: "Lower East Side", hasOffer: true, category: "Food & Drink", trending: false },
  { emoji: "🥟", title: "Dim Sum in Chinatown", location: "Chinatown, Manhattan", hasOffer: false, category: "Food & Drink", trending: false },
  { emoji: "☕", title: "Coffee in SoHo", location: "SoHo, Manhattan", hasOffer: true, category: "Food & Drink", trending: false },
  { emoji: "🥯", title: "Bagels & Lox", location: "Ess-a-Bagel, Midtown East", hasOffer: false, category: "Food & Drink", trending: false },
  { emoji: "🛒", title: "Chelsea Market", location: "Chelsea, Manhattan", hasOffer: true, category: "Food & Drink", trending: false },
  // Sports
  { emoji: "⚽", title: "Soccer at Pier 40", location: "Pier 40, Hudson River Park", hasOffer: false, category: "Sports", trending: false },
  { emoji: "🎾", title: "Tennis in Central Park", location: "Central Park Tennis Center", hasOffer: false, category: "Sports", trending: false },
  { emoji: "🧗", title: "Rock Climbing at Chelsea Piers", location: "Chelsea Piers, Manhattan", hasOffer: false, category: "Sports", trending: false },
  { emoji: "⚾", title: "Yankees Game", location: "Yankee Stadium, the Bronx", hasOffer: false, category: "Sports", trending: false },
  { emoji: "⛸️", title: "Ice Skating at Rockefeller", location: "Rockefeller Center, Midtown", hasOffer: false, category: "Sports", trending: false },
  { emoji: "🎪", title: "Trapeze School NYC", location: "Pier 40, Hudson River Park", hasOffer: false, category: "Sports", trending: true },
  // Nightlife
  { emoji: "🎤", title: "Karaoke in Koreatown", location: "K-Town, 32nd St", hasOffer: true, category: "Nightlife", trending: false },
  { emoji: "🎳", title: "Bowling at Brooklyn Bowl", location: "Williamsburg, Brooklyn", hasOffer: true, category: "Nightlife", trending: false },
  { emoji: "🎬", title: "Movie at Nitehawk Cinema", location: "Williamsburg, Brooklyn", hasOffer: false, category: "Nightlife", trending: false },
  // Arts & Culture
  { emoji: "🎷", title: "Jazz at Smalls", location: "Smalls Jazz Club, West Village", hasOffer: false, category: "Arts & Culture", trending: true },
  { emoji: "🎭", title: "Comedy Show", location: "Village Vanguard", hasOffer: true, category: "Arts & Culture", trending: false },
  { emoji: "🎨", title: "Whitney Museum", location: "Meatpacking District", hasOffer: false, category: "Arts & Culture", trending: false },
  { emoji: "📚", title: "Strand Bookstore", location: "Union Square, Manhattan", hasOffer: false, category: "Arts & Culture", trending: false },
  { emoji: "🛍️", title: "Shop at Brooklyn Flea", location: "DUMBO, Brooklyn", hasOffer: false, category: "Arts & Culture", trending: false },
  // Wellness
  { emoji: "🛁", title: "Wall St Baths", location: "Wall Street Bath & Spa", hasOffer: false, category: "Wellness", trending: true },
];

const CATEGORIES = [
  { name: "Outdoors", emoji: "🌳" },
  { name: "Food & Drink", emoji: "🍽️" },
  { name: "Sports", emoji: "🏅" },
  { name: "Nightlife", emoji: "🌙" },
  { name: "Arts & Culture", emoji: "🎨" },
  { name: "Wellness", emoji: "🧘" },
] as const;

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

const CARD_GRADIENTS = [
  "from-violet-600 via-purple-500 to-fuchsia-400",
  "from-blue-600 via-indigo-500 to-violet-500",
  "from-rose-500 via-pink-500 to-purple-500",
  "from-amber-500 via-orange-400 to-rose-500",
  "from-emerald-500 via-teal-500 to-cyan-400",
];

function getCardGradient(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
}

function getIdeaEmoji(title: string): string {
  const match = HANGOUT_IDEAS.find((i) => i.title === title);
  return match?.emoji ?? "✨";
}

function formatHangDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return "Today · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
  const [activeTab, setActiveTab] = useState<"home" | "calendar" | "new" | "explore" | "profile">("home");
  const [homeFilter, setHomeFilter] = useState<"upcoming" | "invites" | "past">("upcoming");
  const [showHangModal, setShowHangModal] = useState(false);

  // Google Calendar state
  const [gcalConnected, setGcalConnected] = useState<boolean | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calWeekOffset, setCalWeekOffset] = useState(0);
  const [gcalLoading, setGcalLoading] = useState(false);
  const [gcalError, setGcalError] = useState<string | null>(null);
  const [calEventsKey, setCalEventsKey] = useState(0);
  const calendarScrollRef = useRef<HTMLDivElement>(null);

  // Profile starring state (persisted to localStorage)
  const [starredFriendIds, setStarredFriendIds] = useState<string[]>([]);
  const [starredCategories, setStarredCategories] = useState<string[]>([]);
  const [showAddFriend, setShowAddFriend] = useState(false);

  useEffect(() => {
    const sf = localStorage.getItem("starredFriendIds");
    const sc = localStorage.getItem("starredCategories");
    if (sf) setStarredFriendIds(JSON.parse(sf));
    if (sc) setStarredCategories(JSON.parse(sc));
  }, []);

  const toggleStarFriend = (id: string) => {
    setStarredFriendIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("starredFriendIds", JSON.stringify(next));
      return next;
    });
  };

  const toggleStarCategory = (name: string) => {
    setStarredCategories((prev) => {
      const next = prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name];
      localStorage.setItem("starredCategories", JSON.stringify(next));
      return next;
    });
  };

  // Calendar create modal state
  const [showCalCreate, setShowCalCreate] = useState(false);
  const [calCreateDate, setCalCreateDate] = useState<Date | null>(null);
  const [calCreateStartTime, setCalCreateStartTime] = useState("");
  const [calCreateEndTime, setCalCreateEndTime] = useState("");
  const [calCreateTitle, setCalCreateTitle] = useState("");
  const [calCreateLocation, setCalCreateLocation] = useState("");
  const [calCreateFriendIds, setCalCreateFriendIds] = useState<string[]>([]);
  const [calCreateIdeaSelected, setCalCreateIdeaSelected] = useState(false);
  const [calCreateSubmitting, setCalCreateSubmitting] = useState(false);
  const [calCreateError, setCalCreateError] = useState<string | null>(null);

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

      // Check Google Calendar connection
      const { data: gcalToken } = await supabase
        .from("google_calendar_tokens")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      setGcalConnected(!!gcalToken);

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

  const handleDisconnectGcal = async () => {
    await fetch("/api/google-calendar/disconnect", { method: "POST" });
    setGcalConnected(false);
    setCalendarEvents([]);
  };

  const handleAddToCalendar = async () => {
    if (!profile || !scheduleSelectedIdea || !scheduleSelectedTime) {
      setScheduleError("Select a time.");
      return;
    }
    setScheduleError(null);
    setScheduling(true);

    const startDt = scheduleSelectedTime.datetime;
    const endDt = new Date(new Date(startDt).getTime() + 60 * 60 * 1000).toISOString();

    if (gcalConnected) {
      await fetch("/api/google-calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: scheduleSelectedIdea.title,
          location: scheduleSelectedIdea.location,
          start: startDt,
          end: endDt,
        }),
      });
    }

    const supabase = getSupabase();
    const { data: selfRow } = await supabase.from("hangout_suggestions").insert({
      sender_user_id: profile.id,
      recipient_user_id: null,
      interest_id: null,
      proposed_datetime: startDt,
      location: scheduleSelectedIdea.location,
      description: scheduleSelectedIdea.title,
      message: null,
      status: "accepted",
    }).select("id").single();

    if (selfRow) {
      setHangs((prev) => {
        const newHang: Hang = {
          id: selfRow.id,
          proposed_datetime: startDt,
          message: null,
          location: scheduleSelectedIdea!.location,
          description: scheduleSelectedIdea!.title,
          interest: null,
          friend: null,
        };
        return [...prev, newHang].sort(
          (a, b) => new Date(a.proposed_datetime).getTime() - new Date(b.proposed_datetime).getTime()
        );
      });
    }

    if (scheduleSelectedFriendIds.length > 0) {
      for (const friendId of scheduleSelectedFriendIds) {
        const { error } = await supabase.from("hangout_suggestions").insert({
          sender_user_id: profile.id,
          recipient_user_id: friendId,
          interest_id: null,
          proposed_datetime: startDt,
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
    }

    setScheduling(false);
    setShowHangModal(false);
    setScheduleSelectedFriendIds([]);
    setScheduleSelectedTime(null);
    setScheduleSelectedIdea(null);
  };

  const handleCalCreateSubmit = async () => {
    if (!calCreateDate || !calCreateTitle.trim()) {
      setCalCreateError("Please add a title.");
      return;
    }
    const [startH, startM] = calCreateStartTime.split(":").map(Number);
    const [endH, endM] = calCreateEndTime.split(":").map(Number);
    const startDt = new Date(calCreateDate);
    startDt.setHours(startH, startM, 0, 0);
    const endDt = new Date(calCreateDate);
    endDt.setHours(endH, endM, 0, 0);
    if (endDt <= startDt) { setCalCreateError("End time must be after start time."); return; }
    setCalCreateError(null);
    setCalCreateSubmitting(true);
    if (gcalConnected) {
      const res = await fetch("/api/google-calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: calCreateTitle.trim(),
          location: calCreateLocation.trim() || undefined,
          start: startDt.toISOString(),
          end: endDt.toISOString(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setCalCreateError(err?.error?.message ?? "Failed to create event.");
        setCalCreateSubmitting(false);
        return;
      }
    }
    if (profile) {
      const supabase = getSupabase();
      const { data: selfRow } = await supabase.from("hangout_suggestions").insert({
        sender_user_id: profile.id,
        recipient_user_id: null,
        interest_id: null,
        proposed_datetime: startDt.toISOString(),
        location: calCreateLocation.trim() || null,
        description: calCreateTitle.trim(),
        message: null,
        status: "accepted",
      }).select("id").single();

      if (selfRow) {
        setHangs((prev) => {
          const newHang: Hang = {
            id: selfRow.id,
            proposed_datetime: startDt.toISOString(),
            message: null,
            location: calCreateLocation.trim() || null,
            description: calCreateTitle.trim(),
            interest: null,
            friend: null,
          };
          return [...prev, newHang].sort(
            (a, b) => new Date(a.proposed_datetime).getTime() - new Date(b.proposed_datetime).getTime()
          );
        });
      }

      for (const fid of calCreateFriendIds) {
        await supabase.from("hangout_suggestions").insert({
          sender_user_id: profile.id,
          recipient_user_id: fid,
          interest_id: null,
          proposed_datetime: startDt.toISOString(),
          location: calCreateLocation.trim() || null,
          description: calCreateTitle.trim(),
          message: null,
          status: "pending",
        });
      }
    }
    setCalCreateSubmitting(false);
    setShowCalCreate(false);
    setCalEventsKey((k) => k + 1);
  };

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

  // Read ?tab=calendar from redirect after Google Calendar OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "calendar") {
      setActiveTab("calendar");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  // Fetch Google Calendar events when calendar tab is active
  useEffect(() => {
    if (activeTab !== "calendar" || !gcalConnected) return;
    setGcalLoading(true);
    setGcalError(null);
    const ws = new Date();
    ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7) + calWeekOffset * 7);
    ws.setHours(0, 0, 0, 0);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 7);
    fetch(`/api/google-calendar/events?timeMin=${ws.toISOString()}&timeMax=${we.toISOString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCalendarEvents(data);
        } else {
          setGcalError(data?.error ?? "Failed to load events");
          setCalendarEvents([]);
        }
        setGcalLoading(false);
      })
      .catch(() => { setGcalError("Failed to load events"); setGcalLoading(false); });
  }, [activeTab, calWeekOffset, gcalConnected, calEventsKey]);

  // Auto-scroll time grid to current hour when calendar opens
  useEffect(() => {
    if (activeTab === "calendar" && gcalConnected && calendarScrollRef.current) {
      const h = new Date().getHours();
      calendarScrollRef.current.scrollTop = Math.max(0, (h - 7)) * 48;
    }
  }, [activeTab, gcalConnected]);

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

  if (loading || showIntro) {
    return <IntroAnimation loading={loading} />;
  }

  const today = new Date();
  const todayHangs = hangs.filter((h) => new Date(h.proposed_datetime).toDateString() === today.toDateString());
  const next7 = new Date(today); next7.setDate(today.getDate() + 7);
  const nextUpHangs = hangs.filter((h) => { const d = new Date(h.proposed_datetime); return d > today && d <= next7; });

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pb-28">

        {/* ── HOME TAB ─────────────────────────────────── */}
        {activeTab === "home" && (
          <div className="px-4 pt-14">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold">Hey {profile?.first_name}</h1>
                <p className="mt-0.5 text-sm text-zinc-400">
                  {todayHangs.length > 0 ? "You have plans tonight 🌙" : "No plans today"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative mt-1 rounded-full bg-zinc-900 p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-zinc-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                {notificationCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {notificationCount}
                  </span>
                )}
              </button>
            </div>

            {/* Notifications panel */}
            {showNotifications && (
              <div className="mb-6 rounded-2xl bg-zinc-900 p-4">
                <p className="mb-3 text-sm font-semibold">Notifications</p>
                {friendRequests.length === 0 && hangoutRequests.length === 0 ? (
                  <p className="text-sm text-zinc-500">No new notifications.</p>
                ) : (
                  <div className="space-y-3">
                    {friendRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{req.first_name}</p>
                          <p className="text-xs text-zinc-500">wants to be your friend</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleAcceptFriend(req.id)} className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white">Accept</button>
                          <button type="button" onClick={() => handleDeclineFriend(req.id)} className="rounded-full bg-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300">Decline</button>
                        </div>
                      </div>
                    ))}
                    {hangoutRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{req.first_name}</p>
                          <p className="text-xs text-zinc-500">invited you to hang out</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleAcceptHangout(req.id)} className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white">Accept</button>
                          <button type="button" onClick={() => handleDeclineHangout(req.id)} className="rounded-full bg-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300">Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="mb-6 flex items-center gap-2">
              {(["upcoming", "invites", "past"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setHomeFilter(tab)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${homeFilter === tab ? "bg-white text-black" : "bg-zinc-900 text-zinc-400"}`}
                >
                  {tab === "upcoming" && "Upcoming"}
                  {tab === "invites" && <>Invites{hangoutRequests.length > 0 ? ` (${hangoutRequests.length})` : ""}</>}
                  {tab === "past" && "Past Hangs"}
                </button>
              ))}
            </div>

            {/* Tab content — fixed height keeps Ideas row stationary */}
            <div className="no-scrollbar mb-6 h-[300px] overflow-y-auto space-y-2.5">

              {/* Upcoming tab */}
              {homeFilter === "upcoming" && (
                hangs.length === 0 ? (
                  <p className="pt-2 text-sm text-zinc-500">No upcoming hangs.</p>
                ) : (
                  hangs.map((hang) => {
                    const title = hang.description || hang.interest?.title || "Hangout";
                    return (
                      <div key={hang.id} className="flex items-center gap-3 rounded-2xl bg-zinc-900 p-3.5">
                        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getCardGradient(title)} text-2xl`}>
                          {getIdeaEmoji(title)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{title}</p>
                          <p className="mt-0.5 text-xs text-zinc-400">{formatHangDate(hang.proposed_datetime)}</p>
                          {hang.friend && (
                            <div className="mt-1 flex items-center gap-1.5">
                              {hang.friend.profile_photo_url ? (
                                <img src={hang.friend.profile_photo_url} alt="" className="h-4 w-4 rounded-full" />
                              ) : (
                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[9px] text-zinc-300">{hang.friend.first_name[0]}</div>
                              )}
                              <span className="text-xs text-zinc-500">{hang.friend.first_name}</span>
                            </div>
                          )}
                        </div>
                        <span className="flex-shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-400">Going</span>
                      </div>
                    );
                  })
                )
              )}

              {/* Invites tab */}
              {homeFilter === "invites" && (
                friendRequests.length === 0 && hangoutRequests.length === 0 ? (
                  <p className="pt-2 text-sm text-zinc-500">No pending invites.</p>
                ) : (
                  <>
                    {friendRequests.map((req) => (
                      <div key={req.id} className="flex items-center gap-3 rounded-2xl bg-zinc-900 p-3.5">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-500 text-2xl">
                          👤
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{req.first_name}</p>
                          <p className="mt-0.5 text-xs text-zinc-400">Friend request</p>
                        </div>
                        <div className="flex flex-shrink-0 gap-2">
                          <button type="button" onClick={() => handleAcceptFriend(req.id)} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">Accept</button>
                          <button type="button" onClick={() => handleDeclineFriend(req.id)} className="rounded-full bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300">Decline</button>
                        </div>
                      </div>
                    ))}
                    {hangoutRequests.map((req) => {
                      const title = req.interest_title || "Hangout";
                      return (
                        <div key={req.id} className="flex items-center gap-3 rounded-2xl bg-zinc-900 p-3.5">
                          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getCardGradient(title)} text-2xl`}>
                            {getIdeaEmoji(title)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{title}</p>
                            <p className="mt-0.5 text-xs text-zinc-400">{formatHangDate(req.proposed_datetime)}</p>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-xs text-zinc-500">from {req.first_name}</span>
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 gap-2">
                            <button type="button" onClick={() => handleAcceptHangout(req.id)} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">Accept</button>
                            <button type="button" onClick={() => handleDeclineHangout(req.id)} className="rounded-full bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300">Decline</button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )
              )}

              {/* Past tab */}
              {homeFilter === "past" && (
                <p className="pt-2 text-sm text-zinc-500">Past hangs coming soon.</p>
              )}

            </div>{/* end fixed-height tab container */}

            {/* Trending — always visible */}
            <div className="mb-6">
              <h3 className="mb-3 text-lg font-semibold">Trending</h3>
              <div className="no-scrollbar flex items-start gap-3 overflow-x-auto pb-2">
                {HANGOUT_IDEAS.filter((i) => i.trending).map((idea) => (
                  <button
                    key={idea.title}
                    type="button"
                    onClick={() => { setScheduleSelectedIdea(idea); setScheduleSelectedFriendIds([]); setScheduleSelectedTime(null); setShowHangModal(true); }}
                    className="w-40 flex-shrink-0 text-left"
                  >
                    <div className={`mb-2 flex h-24 w-full items-center justify-center rounded-2xl bg-gradient-to-br ${getCardGradient(idea.title)} text-4xl`}>
                      {idea.emoji}
                    </div>
                    <p className="text-sm font-semibold leading-snug">{idea.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{idea.location}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CALENDAR TAB ─────────────────────────────── */}
        {activeTab === "calendar" && (() => {
          // Loading state
          if (gcalConnected === null) {
            return (
              <div className="flex items-center justify-center pt-40">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
              </div>
            );
          }

          // Not connected — prompt to link
          if (!gcalConnected) {
            return (
              <div className="flex flex-col items-center justify-center px-8 pt-28 text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-900">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.3} stroke="currentColor" className="h-10 w-10 text-zinc-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Connect Google Calendar</h2>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  See your events and schedule hangs around your real plans
                </p>
                <a
                  href="/api/google-calendar/auth"
                  className="mt-8 flex items-center gap-3 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-zinc-900 shadow-xl hover:bg-zinc-100 active:scale-95 transition-all"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Link Google Calendar
                </a>
              </div>
            );
          }

          // Connected — week view
          const CELL_H = 48;
          const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm
          const calToday = new Date();

          const weekStart = new Date(calToday);
          weekStart.setDate(calToday.getDate() - ((calToday.getDay() + 6) % 7) + calWeekOffset * 7);
          weekStart.setHours(0, 0, 0, 0);

          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            return d;
          });

          const timedEventsForDay = (day: Date) =>
            calendarEvents.filter((e) => {
              if (e.allDay || !e.start.dateTime) return false;
              return new Date(e.start.dateTime).toDateString() === day.toDateString();
            });

          const allDayEventsForDay = (day: Date) =>
            calendarEvents.filter((e) => {
              if (!e.allDay || !e.start.date) return false;
              return new Date(e.start.date + "T00:00:00").toDateString() === day.toDateString();
            });

          const hasAnyAllDay = days.some((d) => allDayEventsForDay(d).length > 0);
          const nowH = calToday.getHours() + calToday.getMinutes() / 60;

          const monthLabel = (() => {
            const startMonth = weekStart.toLocaleDateString("en-US", { month: "long" });
            const endMonth = days[6].toLocaleDateString("en-US", { month: "long" });
            const year = weekStart.getFullYear();
            return startMonth === endMonth
              ? `${startMonth} ${year}`
              : `${startMonth} – ${endMonth} ${year}`;
          })();

          return (
            <div className="flex flex-col" style={{ height: "calc(100vh - 5rem)" }}>
              {/* Navigation header */}
              <div className="flex flex-shrink-0 items-center justify-between px-4 pt-14 pb-3">
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setCalWeekOffset((w) => w - 1)}
                    className="rounded-full p-2 text-zinc-400 hover:bg-zinc-900 active:bg-zinc-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <span className="min-w-[160px] text-center text-[15px] font-semibold text-white">
                    {monthLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalWeekOffset((w) => w + 1)}
                    className="rounded-full p-2 text-zinc-400 hover:bg-zinc-900 active:bg-zinc-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {gcalLoading && (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-400" />
                  )}
                  {gcalError && (
                    <a
                      href="/api/google-calendar/auth"
                      className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/25"
                    >
                      Reconnect
                    </a>
                  )}
                  {!gcalError && calWeekOffset !== 0 && (
                    <button
                      type="button"
                      onClick={() => setCalWeekOffset(0)}
                      className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                    >
                      Today
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDisconnectGcal}
                    title="Disconnect Google Calendar"
                    className="rounded-full p-1.5 text-zinc-700 hover:bg-zinc-900 hover:text-zinc-400"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="flex flex-shrink-0 border-b border-zinc-800" style={{ paddingLeft: "36px" }}>
                {days.map((day, i) => {
                  const isToday = day.toDateString() === calToday.toDateString();
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center py-1.5">
                      <span className={`text-[10px] font-medium uppercase tracking-wide ${isToday ? "text-violet-400" : "text-zinc-500"}`}>
                        {day.toLocaleDateString("en-US", { weekday: "short" }).charAt(0)}
                      </span>
                      <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-violet-500 text-white" : "text-zinc-300"}`}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* All-day row */}
              {hasAnyAllDay && (
                <div className="flex flex-shrink-0 border-b border-zinc-800" style={{ paddingLeft: "36px" }}>
                  {days.map((day, i) => {
                    const events = allDayEventsForDay(day);
                    return (
                      <div key={i} className="flex-1 px-0.5 py-0.5">
                        {events.map((e) => (
                          <div
                            key={e.id}
                            className="truncate rounded px-1 text-[9px] font-medium"
                            style={{ backgroundColor: e.color + "33", color: e.color }}
                          >
                            {e.summary}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Scrollable time grid */}
              <div className="flex-1 overflow-y-auto" ref={calendarScrollRef}>
                <div className="flex">
                  {/* Time labels */}
                  <div className="w-9 flex-shrink-0">
                    {HOURS.map((h) => (
                      <div key={h} className="flex items-start justify-end pr-1.5" style={{ height: CELL_H }}>
                        <span className="mt-[-6px] text-[9px] text-zinc-600">
                          {h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {days.map((day, di) => {
                    const isToday = day.toDateString() === calToday.toDateString();
                    const events = timedEventsForDay(day);
                    return (
                      <div
                        key={di}
                        className={`relative flex-1 border-l border-zinc-800/50 ${isToday ? "bg-violet-950/10" : ""}`}
                        style={{ height: HOURS.length * CELL_H }}
                      >
                        {/* Hour lines — clickable to create event */}
                        {HOURS.map((h) => (
                          <div
                            key={h}
                            className="border-b border-zinc-800/30 hover:bg-white/[0.025] active:bg-white/[0.05]"
                            style={{ height: CELL_H, cursor: "default" }}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const minute = (e.clientY - rect.top) >= CELL_H / 2 ? 30 : 0;
                              const endH = minute === 30 ? h + 1 : h;
                              const endM = minute === 30 ? 0 : 30;
                              setCalCreateDate(day);
                              setCalCreateStartTime(`${h.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`);
                              setCalCreateEndTime(`${(endH % 24).toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`);
                              setCalCreateTitle("");
                              setCalCreateLocation("");
                              setCalCreateFriendIds([]);
                              setCalCreateIdeaSelected(false);
                              setCalCreateError(null);
                              setShowCalCreate(true);
                            }}
                          />
                        ))}

                        {/* Current time indicator */}
                        {isToday && nowH >= 6 && nowH <= 23 && (
                          <div
                            className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                            style={{ top: (nowH - 6) * CELL_H }}
                          >
                            <div className="-ml-1 h-2 w-2 flex-shrink-0 rounded-full bg-red-400" />
                            <div className="h-px flex-1 bg-red-400" />
                          </div>
                        )}

                        {/* Events */}
                        {events.map((event) => {
                          const s = new Date(event.start.dateTime!);
                          const e = new Date(event.end.dateTime!);
                          const sh = s.getHours() + s.getMinutes() / 60;
                          const eh = e.getHours() + e.getMinutes() / 60;
                          const top = Math.max(0, sh - 6) * CELL_H;
                          const height = Math.max((eh - sh) * CELL_H, 18);
                          return (
                            <div
                              key={event.id}
                              className="absolute left-0.5 right-0.5 overflow-hidden rounded px-1 py-0.5"
                              style={{
                                top,
                                height,
                                backgroundColor: event.color + "28",
                                borderLeft: `2px solid ${event.color}`,
                              }}
                            >
                              <p
                                className="truncate text-[9px] font-semibold leading-tight"
                                style={{ color: event.color }}
                              >
                                {event.summary}
                              </p>
                              {height >= 28 && (
                                <p className="text-[8px] leading-tight opacity-70" style={{ color: event.color }}>
                                  {s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── NEW TAB ───────────────────────────────────── */}
        {activeTab === "new" && (
          <div className="px-4 pt-14">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold">New Hang</h1>
              {showScheduleHangout && (
                <button
                  type="button"
                  onClick={() => { setShowScheduleHangout(false); setScheduleSelectedFriendIds([]); setScheduleSelectedTime(null); setScheduleSelectedIdea(null); setScheduleError(null); }}
                  className="rounded-full p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
              )}
            </div>

            {!showScheduleHangout ? (
              <>
                {friends.length > 0 && (
                  <div className="no-scrollbar mb-5 flex gap-3 overflow-x-auto pb-1">
                    {friends.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => { toggleScheduleFriend(f.id); setShowScheduleHangout(true); }}
                        className="flex flex-shrink-0 flex-col items-center gap-1"
                      >
                        {f.profile_photo_url ? (
                          <img src={f.profile_photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-400">{f.first_name[0]}</div>
                        )}
                        <span className="text-xs text-zinc-500">{f.first_name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {HANGOUT_IDEAS.map((idea) => (
                    <button
                      key={idea.title}
                      type="button"
                      onClick={() => { setScheduleSelectedIdea(idea); setShowScheduleHangout(true); }}
                      className="relative rounded-2xl bg-zinc-900 p-4 text-left transition-colors hover:bg-zinc-800"
                    >
                      {idea.hasOffer && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute right-3 top-3 h-4 w-4 text-zinc-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                        </svg>
                      )}
                      <span className="mb-2 block text-2xl">{idea.emoji}</span>
                      <p className="text-sm font-semibold leading-snug text-white">{idea.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">{idea.location}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-3xl bg-zinc-900 p-6">
                <div className="mb-7">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Who</p>
                  {friends.length === 0 ? (
                    <p className="text-sm text-zinc-500">Add friends first.</p>
                  ) : (
                    <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
                      {friends.map((f) => {
                        const selected = scheduleSelectedFriendIds.includes(f.id);
                        return (
                          <button key={f.id} type="button" onClick={() => toggleScheduleFriend(f.id)} className="flex flex-shrink-0 flex-col items-center gap-1.5 transition-all">
                            <div className={`relative rounded-full ring-2 ring-offset-2 ring-offset-zinc-900 transition-all ${selected ? "ring-white" : "ring-transparent"}`}>
                              {f.profile_photo_url ? (
                                <img src={f.profile_photo_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-lg font-semibold text-zinc-400">{f.first_name[0]}</div>
                              )}
                              {selected && (
                                <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-zinc-900">
                                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <span className={`text-xs font-medium ${selected ? "text-white" : "text-zinc-500"}`}>{f.first_name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mb-7">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">When</p>
                  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                    {getTimeSuggestions().map((slot) => {
                      const selected = scheduleSelectedTime?.datetime === slot.datetime;
                      return (
                        <button
                          key={slot.datetime}
                          type="button"
                          onClick={() => setScheduleSelectedTime(selected ? null : slot)}
                          className={`flex-shrink-0 rounded-2xl px-4 py-3 text-left transition-all ${selected ? "bg-white" : "bg-zinc-800 hover:bg-zinc-700"}`}
                        >
                          <p className={`text-sm font-semibold ${selected ? "text-zinc-900" : "text-zinc-200"}`}>{slot.label}</p>
                          <p className={`mt-0.5 text-xs ${selected ? "text-zinc-500" : "text-zinc-400"}`}>{slot.sublabel}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-7">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Pick a hang</p>
                  <div className="grid grid-cols-2 gap-3">
                    {HANGOUT_IDEAS.map((idea) => {
                      const selected = scheduleSelectedIdea?.title === idea.title;
                      const dateLabel = scheduleSelectedTime?.sublabel ?? "Pick a time";
                      return (
                        <button
                          key={idea.title}
                          type="button"
                          onClick={() => setScheduleSelectedIdea(selected ? null : idea)}
                          className={`relative rounded-2xl p-4 text-left transition-all ${selected ? "bg-white ring-2 ring-white" : "bg-zinc-800 hover:bg-zinc-700"}`}
                        >
                          {idea.hasOffer && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute right-3 top-3 h-4 w-4 text-zinc-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                            </svg>
                          )}
                          <span className="mb-2.5 block text-2xl">{idea.emoji}</span>
                          <p className={`text-sm font-semibold leading-snug ${selected ? "text-zinc-900" : "text-zinc-100"}`}>{idea.title}</p>
                          <p className={`mt-1 text-xs ${selected ? "text-zinc-500" : "text-zinc-400"}`}>{idea.location}</p>
                          <p className={`mt-0.5 text-xs ${selected ? "text-zinc-500" : "text-zinc-400"}`}>{dateLabel}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {scheduleError && <p className="mb-4 text-sm text-red-400">{scheduleError}</p>}
                <button
                  type="button"
                  onClick={handleScheduleHangout}
                  disabled={scheduling || scheduleSelectedFriendIds.length === 0 || !scheduleSelectedTime || !scheduleSelectedIdea}
                  className="w-full rounded-2xl bg-white py-3.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-zinc-100 disabled:opacity-25"
                >
                  {scheduling ? "Sending…" : "Send Invitation"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── EXPLORE TAB ──────────────────────────────── */}
        {activeTab === "explore" && (
          <div className="px-4 pt-14 pb-4">
            <h1 className="mb-6 text-3xl font-bold">Explore</h1>
            <div className="space-y-8">
              {CATEGORIES.map((cat) => {
                const ideas = HANGOUT_IDEAS.filter((i) => i.category === cat.name);
                if (ideas.length === 0) return null;
                return (
                  <div key={cat.name}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-lg">{cat.emoji}</span>
                      <h2 className="text-base font-semibold text-white">{cat.name}</h2>
                    </div>
                    <div className="no-scrollbar flex items-start gap-3 overflow-x-auto pb-1">
                      {ideas.map((idea) => (
                        <button
                          key={idea.title}
                          type="button"
                          onClick={() => { setScheduleSelectedIdea(idea); setScheduleSelectedFriendIds([]); setScheduleSelectedTime(null); setShowHangModal(true); }}
                          className="w-36 flex-shrink-0 text-left"
                        >
                          <div className={`mb-2 flex h-20 w-full items-center justify-center rounded-2xl bg-gradient-to-br ${getCardGradient(idea.title)} text-3xl`}>
                            {idea.emoji}
                          </div>
                          <p className="text-xs font-semibold leading-snug text-white">{idea.title}</p>
                          <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{idea.location}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PROFILE TAB ──────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="px-4 pt-14 pb-28 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
              {profile?.profile_photo_url ? (
                <img src={profile.profile_photo_url} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800 text-2xl font-bold text-zinc-400">{profile?.first_name?.[0]}</div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{profile?.first_name}</h1>
                <p className="text-zinc-500">@{profile?.username}</p>
              </div>
            </div>

            {/* Counts row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-900 p-5 text-left">
                <p className="text-3xl font-bold">{friends.length}</p>
                <p className="text-sm text-zinc-500">Friends</p>
              </div>
              <div className="rounded-2xl bg-zinc-900 p-5 text-left">
                <p className="text-3xl font-bold">{interests.length}</p>
                <p className="text-sm text-zinc-500">Interests</p>
              </div>
            </div>

            {/* Friends section */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Friends</p>
                <button
                  type="button"
                  onClick={() => setShowAddFriend((v) => !v)}
                  className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                >
                  {showAddFriend ? "Done" : "+ Add"}
                </button>
              </div>

              {showAddFriend && (
                <div className="mb-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Search by name or username..."
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                  />
                  {searching && <p className="text-sm text-zinc-500">Searching...</p>}
                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      {searchResults.map((user) => (
                        <div key={user.id} className="flex items-center justify-between rounded-xl bg-zinc-900 p-3">
                          <div className="flex items-center gap-3">
                            {user.profile_photo_url ? (
                              <img src={user.profile_photo_url} alt="" className="h-8 w-8 rounded-full" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-400">{user.first_name[0]}</div>
                            )}
                            <div>
                              <p className="text-sm font-medium">{user.first_name}</p>
                              <p className="text-xs text-zinc-500">@{user.username}</p>
                            </div>
                          </div>
                          {addedFriends.has(user.id) ? (
                            <span className="text-sm text-emerald-400">Added</span>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              <button type="button" onClick={() => handleAddFriend(user.id)} className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100">Add</button>
                              {friendErrors[user.id] && <p className="text-xs text-red-400">{friendErrors[user.id]}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {friendSearch && !searching && searchResults.length === 0 && <p className="text-sm text-zinc-500">No users found.</p>}
                </div>
              )}

              <div className="space-y-2">
                {friends.length === 0 && (
                  <p className="text-sm text-zinc-600">No friends yet — tap + Add to find people.</p>
                )}
                {friends.map((f) => {
                  const starred = starredFriendIds.includes(f.id);
                  return (
                    <div key={f.id} className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3">
                      <div className="flex items-center gap-3">
                        {f.profile_photo_url ? (
                          <img src={f.profile_photo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-400">{f.first_name[0]}</div>
                        )}
                        <div>
                          <p className="text-sm font-medium">{f.first_name}</p>
                          <p className="text-xs text-zinc-500">@{f.username}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleStarFriend(f.id)}
                        className={`text-xl transition-colors ${starred ? "text-amber-400" : "text-zinc-700 hover:text-zinc-500"}`}
                        title={starred ? "Unstar" : "Star to boost priority"}
                      >
                        ★
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activities section */}
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Activities</p>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => {
                  const starred = starredCategories.includes(cat.name);
                  return (
                    <div key={cat.name} className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cat.emoji}</span>
                        <p className="text-sm font-medium">{cat.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleStarCategory(cat.name)}
                        className={`text-xl transition-colors ${starred ? "text-amber-400" : "text-zinc-700 hover:text-zinc-500"}`}
                        title={starred ? "Unstar" : "Star to boost priority"}
                      >
                        ★
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interests section */}
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Interests</p>
              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a new interest..."
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddInterest(); } }}
                  className="block flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                />
                <button type="button" onClick={handleAddInterest} className="shrink-0 rounded-xl bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100">Add</button>
              </div>
              {interests.length === 0 && (
                <p className="text-sm text-zinc-600">No interests yet — add some above.</p>
              )}
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <span key={interest.id} className="group relative rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-200">
                      {interest.title}
                      <button type="button" onClick={() => handleRemoveInterest(interest.id)} className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] leading-none text-white group-hover:flex">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── HANG MODAL ───────────────────────────────── */}
      {showHangModal && scheduleSelectedIdea && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowHangModal(false); setScheduleSelectedFriendIds([]); setScheduleSelectedTime(null); setScheduleError(null); }}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[61] flex max-h-[88vh] flex-col rounded-t-3xl bg-zinc-900 shadow-2xl">
            {/* Drag handle */}
            <div className="flex-shrink-0 pt-4 pb-2">
              <div className="mx-auto h-1 w-10 rounded-full bg-zinc-700" />
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {/* Selected activity */}
              <div className={`mb-6 flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br ${getCardGradient(scheduleSelectedIdea.title)} px-5 py-4`}>
                <span className="text-4xl">{scheduleSelectedIdea.emoji}</span>
                <div>
                  <p className="text-lg font-bold text-white">{scheduleSelectedIdea.title}</p>
                  <p className="text-sm text-white/60">{scheduleSelectedIdea.location}</p>
                </div>
              </div>

              {/* Who (optional) */}
              {friends.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Add Friends <span className="normal-case tracking-normal text-zinc-600">(optional)</span></p>
                  <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                    {friends.map((f) => {
                      const selected = scheduleSelectedFriendIds.includes(f.id);
                      return (
                        <button key={f.id} type="button" onClick={() => toggleScheduleFriend(f.id)} className="flex flex-shrink-0 flex-col items-center gap-1.5">
                          <div className={`relative rounded-full ring-2 ring-offset-2 ring-offset-zinc-900 transition-all ${selected ? "ring-white" : "ring-transparent"}`}>
                            {f.profile_photo_url ? (
                              <img src={f.profile_photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-base font-semibold text-zinc-400">{f.first_name[0]}</div>
                            )}
                            {selected && (
                              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-zinc-900">
                                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <span className={`text-xs font-medium ${selected ? "text-white" : "text-zinc-500"}`}>{f.first_name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* When */}
              <div className="mb-2">
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">When</p>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {getTimeSuggestions().map((slot) => {
                    const selected = scheduleSelectedTime?.datetime === slot.datetime;
                    return (
                      <button
                        key={slot.datetime}
                        type="button"
                        onClick={() => setScheduleSelectedTime(selected ? null : slot)}
                        className={`flex-shrink-0 rounded-2xl px-4 py-3 text-left transition-all ${selected ? "bg-white" : "bg-zinc-800 hover:bg-zinc-700"}`}
                      >
                        <p className={`text-sm font-semibold ${selected ? "text-zinc-900" : "text-zinc-200"}`}>{slot.label}</p>
                        <p className={`mt-0.5 text-xs ${selected ? "text-zinc-500" : "text-zinc-400"}`}>{slot.sublabel}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {scheduleError && <p className="mt-3 text-sm text-red-400">{scheduleError}</p>}
            </div>

            {/* Pinned button */}
            <div className="flex-shrink-0 px-4 pb-10 pt-3">
              <button
                type="button"
                onClick={handleAddToCalendar}
                disabled={scheduling || !scheduleSelectedTime}
                className="w-full rounded-2xl bg-white py-3.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-zinc-100 disabled:opacity-25"
              >
                {scheduling ? "Adding…" : "Add to Calendar"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── CALENDAR CREATE MODAL ───────────────────── */}
      {showCalCreate && calCreateDate && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCalCreate(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[61] flex max-h-[90vh] flex-col rounded-t-3xl bg-zinc-900 shadow-2xl">
            {/* Drag handle */}
            <div className="flex-shrink-0 pt-4 pb-3">
              <div className="mx-auto h-1 w-10 rounded-full bg-zinc-700" />
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">

              {/* Date label */}
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                {calCreateDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>

              {/* Time row */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex-1">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Start</p>
                  <input
                    type="time"
                    value={calCreateStartTime}
                    onChange={(e) => setCalCreateStartTime(e.target.value)}
                    className="w-full rounded-xl bg-zinc-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div className="mt-4 text-zinc-600">→</div>
                <div className="flex-1">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">End</p>
                  <input
                    type="time"
                    value={calCreateEndTime}
                    onChange={(e) => setCalCreateEndTime(e.target.value)}
                    className="w-full rounded-xl bg-zinc-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Title with idea search */}
              <div className="mb-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">What</p>
                <input
                  type="text"
                  placeholder="Search ideas or type your own…"
                  value={calCreateTitle}
                  onChange={(e) => { setCalCreateTitle(e.target.value); setCalCreateIdeaSelected(false); }}
                  className="w-full rounded-xl bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                {!calCreateIdeaSelected && (() => {
                  const suggestions = calCreateTitle.length >= 1
                    ? HANGOUT_IDEAS.filter((i) => i.title.toLowerCase().includes(calCreateTitle.toLowerCase())).slice(0, 5)
                    : HANGOUT_IDEAS.filter((i) => i.trending);
                  return suggestions.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {suggestions.map((idea) => (
                        <button
                          key={idea.title}
                          type="button"
                          onClick={() => {
                            setCalCreateTitle(idea.title);
                            setCalCreateLocation(idea.location);
                            setCalCreateIdeaSelected(true);
                          }}
                          className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                        >
                          <span>{idea.emoji}</span>
                          <span>{idea.title}</span>
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Location */}
              <div className="mb-5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Where</p>
                <input
                  type="text"
                  placeholder="Location (optional)"
                  value={calCreateLocation}
                  onChange={(e) => setCalCreateLocation(e.target.value)}
                  className="w-full rounded-xl bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              {/* Add Friends */}
              {friends.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                    Add Friends <span className="normal-case tracking-normal text-zinc-600">(optional)</span>
                  </p>
                  <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                    {friends.map((f) => {
                      const selected = calCreateFriendIds.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setCalCreateFriendIds((prev) =>
                            prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                          )}
                          className="flex flex-shrink-0 flex-col items-center gap-1.5"
                        >
                          <div className={`relative rounded-full ring-2 ring-offset-2 ring-offset-zinc-900 transition-all ${selected ? "ring-white" : "ring-transparent"}`}>
                            {f.profile_photo_url ? (
                              <img src={f.profile_photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-base font-semibold text-zinc-400">{f.first_name[0]}</div>
                            )}
                            {selected && (
                              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-zinc-900">
                                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <span className={`text-xs font-medium ${selected ? "text-white" : "text-zinc-500"}`}>{f.first_name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {calCreateError && <p className="mb-3 text-sm text-red-400">{calCreateError}</p>}
            </div>

            {/* Pinned button */}
            <div className="flex-shrink-0 px-4 pb-10 pt-3">
              <button
                type="button"
                onClick={handleCalCreateSubmit}
                disabled={calCreateSubmitting || !calCreateTitle.trim()}
                className="w-full rounded-2xl bg-white py-3.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-zinc-100 disabled:opacity-25"
              >
                {calCreateSubmitting ? "Adding…" : "Add to Calendar"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── BOTTOM NAV ───────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/60 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-end justify-around px-2 py-2 pb-4">
          <button type="button" onClick={() => setActiveTab("home")} className={`flex flex-col items-center gap-0.5 px-4 py-1 ${activeTab === "home" ? "text-white" : "text-zinc-600"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={activeTab === "home" ? 2 : 1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button type="button" onClick={() => setActiveTab("calendar")} className={`flex flex-col items-center gap-0.5 px-4 py-1 ${activeTab === "calendar" ? "text-white" : "text-zinc-600"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={activeTab === "calendar" ? 2 : 1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <span className="text-[10px] font-medium">Calendar</span>
          </button>
          <button type="button" onClick={() => setActiveTab("new")} className="-mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-900/60">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-7 w-7 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <button type="button" onClick={() => setActiveTab("explore")} className={`flex flex-col items-center gap-0.5 px-4 py-1 ${activeTab === "explore" ? "text-white" : "text-zinc-600"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={activeTab === "explore" ? 2 : 1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253M3 12c0 .778.099 1.533.284 2.253" />
            </svg>
            <span className="text-[10px] font-medium">Explore</span>
          </button>
          <button type="button" onClick={() => setActiveTab("profile")} className={`flex flex-col items-center gap-0.5 px-4 py-1 ${activeTab === "profile" ? "text-white" : "text-zinc-600"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={activeTab === "profile" ? 2 : 1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
