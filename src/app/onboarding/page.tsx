"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayAvailability {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

const defaultAvailability: DayAvailability[] = [
  { enabled: true, startTime: "09:00", endTime: "22:00" },  // Sun
  { enabled: true, startTime: "17:00", endTime: "20:00" },  // Mon
  { enabled: true, startTime: "17:00", endTime: "20:00" },  // Tue
  { enabled: true, startTime: "17:00", endTime: "20:00" },  // Wed
  { enabled: true, startTime: "17:00", endTime: "20:00" },  // Thu
  { enabled: true, startTime: "17:00", endTime: "20:00" },  // Fri
  { enabled: true, startTime: "09:00", endTime: "22:00" },  // Sat
];

interface UserSearchResult {
  id: string;
  first_name: string;
  username: string;
  profile_photo_url: string | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabaseRef = useRef<SupabaseClient | null>(null);
  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }

  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1: Profile
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Step 2: Interests
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");

  // Step 3: Availability
  const [availability, setAvailability] = useState<DayAvailability[]>(defaultAvailability);

  // Step 4: Find Friends
  const [friendSearch, setFriendSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [addedFriends, setAddedFriends] = useState<Set<string>>(new Set());
  const [friendErrors, setFriendErrors] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);

  // Shared
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Username availability check
  const checkUsername = useCallback(async (value: string) => {
    if (value.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    const { data } = await getSupabase()
      .from("users")
      .select("id")
      .eq("username", value)
      .single();
    setUsernameAvailable(!data);
    setCheckingUsername(false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (username) checkUsername(username);
    }, 400);
    return () => clearTimeout(timeout);
  }, [username, checkUsername]);

  // Friend search (debounced)
  useEffect(() => {
    if (!friendSearch.trim() || !userId) {
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
        .neq("id", userId)
        .limit(10);
      setSearchResults((data as UserSearchResult[]) || []);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [friendSearch, userId]);

  // Step 1: Save profile
  const handleProfileSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated. Please sign in again.");
      setSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase.from("users").insert({
      id: user.id,
      email: user.email!,
      first_name: firstName,
      username,
      profile_photo_url: user.user_metadata?.avatar_url || null,
    });
    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }
    setUserId(user.id);
    setSubmitting(false);
    setStep(2);
  };

  // Step 2: Save interests
  const handleInterestsSubmit = async () => {
    if (interests.length === 0) {
      setStep(3);
      return;
    }
    setError(null);
    setSubmitting(true);
    const supabase = getSupabase();
    const rows = interests.map((title) => ({ user_id: userId!, title }));
    const { error: insertError } = await supabase.from("interests").insert(rows);
    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setStep(3);
  };

  // Step 3: Save availability
  const handleAvailabilitySubmit = async () => {
    const enabledDays = availability
      .map((day, i) => ({ ...day, dayIndex: i }))
      .filter((d) => d.enabled);
    if (enabledDays.length === 0) {
      setStep(4);
      return;
    }
    setError(null);
    setSubmitting(true);
    const supabase = getSupabase();
    const rows = enabledDays.map((d) => ({
      user_id: userId!,
      day_of_week: d.dayIndex,
      start_time: d.startTime,
      end_time: d.endTime,
    }));
    const { error: insertError } = await supabase.from("availability").insert(rows);
    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setStep(4);
  };

  // Step 4: Add friend
  const handleAddFriend = async (friendId: string) => {
    setFriendErrors((prev) => { const next = { ...prev }; delete next[friendId]; return next; });
    const supabase = getSupabase();
    const { error: insertError } = await supabase.from("friends").insert({
      user_id: userId!,
      friend_user_id: friendId,
      status: "pending",
    });
    if (insertError) {
      setFriendErrors((prev) => ({ ...prev, [friendId]: insertError.message }));
    } else {
      setAddedFriends((prev) => new Set(prev).add(friendId));
    }
  };

  // Add interest chip
  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
    }
    setInterestInput("");
  };

  // Toggle day availability
  const toggleDay = (index: number) => {
    setAvailability((prev) =>
      prev.map((d, i) => (i === index ? { ...d, enabled: !d.enabled } : d))
    );
  };

  const updateTime = (index: number, field: "startTime" | "endTime", value: string) => {
    setAvailability((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  };

  const inputClass =
    "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
  const btnPrimary =
    "w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200";
  const btnSecondary =
    "w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md space-y-8 px-4">
        {/* Progress */}
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Step {step} of 4
          </p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full ${
                  s <= step
                    ? "bg-zinc-900 dark:bg-zinc-100"
                    : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Complete Your Profile
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Tell us a bit about yourself
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProfileSubmit();
              }}
              className="space-y-6"
            >
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  minLength={3}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className={inputClass}
                />
                {checkingUsername && (
                  <p className="mt-1 text-sm text-zinc-500">Checking...</p>
                )}
                {usernameAvailable === true && (
                  <p className="mt-1 text-sm text-green-600">Username available</p>
                )}
                {usernameAvailable === false && (
                  <p className="mt-1 text-sm text-red-600">Username taken</p>
                )}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting || usernameAvailable === false}
                className={btnPrimary}
              >
                {submitting ? "Saving..." : "Continue"}
              </button>
            </form>
          </>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Your Interests
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                What do you like to do? Add some interests.
              </p>
            </div>
            <div className="space-y-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Hiking, Board games..."
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addInterest();
                    }
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={addInterest}
                  className="mt-1 shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Add
                </button>
              </div>
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <span
                      key={interest}
                      className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-3 py-1 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      {interest}
                      <button
                        type="button"
                        onClick={() => setInterests(interests.filter((i) => i !== interest))}
                        className="ml-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleInterestsSubmit}
                  disabled={submitting}
                  className={btnPrimary}
                >
                  {submitting ? "Saving..." : "Continue"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className={btnSecondary}
                >
                  Skip
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Hang Times */}
        {step === 3 && (
          <>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Hang Times
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                When are you usually free to hang out?
              </p>
            </div>
            <div className="space-y-4">
              {DAYS.map((day, i) => (
                <div key={day} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={availability[i].enabled}
                    onChange={() => toggleDay(i)}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                  />
                  <span className="w-12 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {day.slice(0, 3)}
                  </span>
                  {availability[i].enabled && (
                    <>
                      <input
                        type="time"
                        value={availability[i].startTime}
                        onChange={(e) => updateTime(i, "startTime", e.target.value)}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                      <span className="text-sm text-zinc-500">to</span>
                      <input
                        type="time"
                        value={availability[i].endTime}
                        onChange={(e) => updateTime(i, "endTime", e.target.value)}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </>
                  )}
                </div>
              ))}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleAvailabilitySubmit}
                  disabled={submitting}
                  className={btnPrimary}
                >
                  {submitting ? "Saving..." : "Continue"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className={btnSecondary}
                >
                  Skip
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 4: Find Friends */}
        {step === 4 && (
          <>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Find Friends
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Search for people you know and add them as friends.
              </p>
            </div>
            <div className="space-y-6">
              <input
                type="text"
                placeholder="Search by name or username..."
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                className={inputClass}
              />
              {searching && (
                <p className="text-sm text-zinc-500">Searching...</p>
              )}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <div className="flex items-center gap-3">
                        {user.profile_photo_url ? (
                          <img
                            src={user.profile_photo_url}
                            alt=""
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {user.first_name[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {user.first_name}
                          </p>
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
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className={btnPrimary}
              >
                Finish
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className={btnSecondary}
              >
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
