"use client";

import { useState, useEffect, useRef } from "react";
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
  friend: { first_name: string; username: string } | null;
}

interface UserSearchResult {
  id: string;
  first_name: string;
  username: string;
  profile_photo_url: string | null;
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
  const [showFriends, setShowFriends] = useState(false);
  const [showInterests, setShowInterests] = useState(false);

  // Friend search state
  const [friendSearch, setFriendSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [addedFriends, setAddedFriends] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);

  // Interest add state
  const [interestInput, setInterestInput] = useState("");

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
        let friend: { first_name: string; username: string } | null = null;
        if (friendId) {
          const { data: fData } = await supabase
            .from("users")
            .select("first_name, username")
            .eq("id", friendId)
            .single();
          friend = fData;
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
    const supabase = getSupabase();
    const { error } = await supabase.from("friends").insert({
      user_id: profile.id,
      friend_user_id: friendId,
      status: "pending",
    });
    if (!error) {
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

  const inputClass =
    "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
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
                    className="rounded-full bg-zinc-200 px-3 py-1 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {interest.title}
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
            <p className="mt-4 text-zinc-500">Schedule a Hang!</p>
          ) : (
            <div className="mt-4 space-y-3">
              {hangs.map((hang) => (
                <div
                  key={hang.id}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      {hang.interest && (
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {hang.interest.title}
                        </p>
                      )}
                      {hang.friend && (
                        <p className="text-sm text-zinc-500">
                          with {hang.friend.first_name} (@{hang.friend.username})
                        </p>
                      )}
                      {hang.location && (
                        <p className="mt-1 text-sm text-zinc-500">{hang.location}</p>
                      )}
                      {hang.description && (
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {hang.description}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm text-zinc-500">
                      {new Date(hang.proposed_datetime).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
