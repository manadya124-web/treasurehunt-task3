"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/navbar";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { authFetch } from "@/lib/authFetch";
import { withNext } from "@/lib/postAuthRedirect";
import { Users, Plus, LogIn, Eye, EyeOff, Info, Calendar, Clock, MapPin } from "lucide-react";

type EventDto = {
  _id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  status: string;
  registration?: boolean;
  teamRegistration?: boolean;
};

const TREASURE_REGISTRATION_PATH = "/events/treasurehunt";
const LOGIN_URL = withNext("/auth/login", TREASURE_REGISTRATION_PATH);

// Remove stale credentials so the login page doesn't bounce the user straight back here.
function clearSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

// Same silent-refresh approach the game page already uses (refresh-token cookie).
async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const json = await res.json().catch(() => ({}));
    const newToken = json?.data?.accessToken;
    if (!newToken) return false;
    localStorage.setItem("accessToken", newToken);
    return true;
  } catch {
    return false;
  }
}

const NETWORK_ERROR_MESSAGE = "Network error. Please check your connection and try again.";

export default function TreasureHuntRegistrationPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [teamPassword, setTeamPassword] = useState("");
  const [showTeamPassword, setShowTeamPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Join team state
  const [joinTeamName, setJoinTeamName] = useState<string>("");
  const [joinPassword, setJoinPassword] = useState<string>("");
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  // Auto-detect existing team
  const [checkingTeam, setCheckingTeam] = useState(true);
  const [teamCheckError, setTeamCheckError] = useState<string | null>(null);
  const [teamCheckAttempt, setTeamCheckAttempt] = useState(0); // bump to retry the check
  const busy = creating || joining; // block double submits across both forms

  const { data, error: eventsError, isLoading } = useSWR(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const treasureEvent: EventDto | null = useMemo(() => {
    const list: EventDto[] = data?.data?.events || [];
    const match = list.find((e) =>
      typeof e.title === "string" &&
      e.title.toLowerCase().includes("treasure") &&
      e.title.includes("2026")
    );
    return match || null;
  }, [data]);

  const eventStatus = treasureEvent?.status; // Past | Ongoing | Upcoming | ComingSoon
  const isComingSoon = eventStatus === "ComingSoon";
  const isUpcoming = eventStatus === "Upcoming";
  const isOngoing = eventStatus === "Ongoing";
  const isPast = eventStatus === "Past";

  useEffect(() => {
    let cancelled = false;

    // Require login, then check whether the student already has a team
    const ensureAndCheck = async () => {
      setCheckingTeam(true);
      setTeamCheckError(null);

      const token = localStorage.getItem("accessToken");
      if (!token) {
        // Remember where the student was going so login/signup/verify can bring them back
        router.replace(LOGIN_URL);
        return;
      }

      try {
        const treasureBase = process.env.NEXT_PUBLIC_TREASURE_API_URL || "https://treasure-hunt-backend-one.vercel.app";
        const myTeamUrl = `${treasureBase}/api/teamhunt/myteam`;

        let res = await authFetch(myTeamUrl, { method: "GET" });
        if (res.status === 401 && (await tryRefreshToken())) {
          res = await authFetch(myTeamUrl, { method: "GET" });
        }
        if (cancelled) return;

        if (res.status === 401) {
          // Session is really gone: clear it and send them to login (then back here)
          clearSession();
          router.replace(LOGIN_URL);
          return;
        }

        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          const teamId = json?.data?.teamId;
          if (teamId) {
            // Already in a team: go straight to the game page (no need to fill forms)
            router.replace(`/events/treasurehunt/game?teamId=${teamId}`);
            return;
          }
          setTeamCheckError("We couldn't read your team details. Please try again.");
        } else if (res.status === 404) {
          // Only trust a 404 that came from the backend's own "no team" JSON reply
          const json = await res.json().catch(() => null);
          if (json && typeof json === "object" && json.statusCode === 404) {
            setCheckingTeam(false); // confirmed: no team yet -> show registration forms
            return;
          }
          setTeamCheckError("We couldn't check your team status (service not found). Please try again later.");
        } else {
          setTeamCheckError("We couldn't check your team status right now. Please try again.");
        }
      } catch (e) {
        if (cancelled) return;
        console.warn("Treasure hunt myteam check failed", e);
        setTeamCheckError(NETWORK_ERROR_MESSAGE);
      }
      if (!cancelled) setCheckingTeam(false);
    };

    ensureAndCheck();
    return () => {
      cancelled = true;
    };
  }, [router, teamCheckAttempt]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setSuccess(null);
    if (!treasureEvent?._id) {
      setError("Event not found. Please try again later.");
      return;
    }
    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }
    if (!teamPassword.trim()) {
      setError("Team password is required.");
      return;
    }
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace(LOGIN_URL);
      return;
    }
    setCreating(true);
    try {
      // 1. Create team in main backend
      const res = await authFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/teams/registerTeam`, {
        method: "POST",
        includeTokenInBody: false,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          teamName: teamName.trim(),
          commonPassword: teamPassword,
          eventId: treasureEvent._id 
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearSession();
        router.replace(LOGIN_URL);
        return;
      }
      if (!res.ok) {
        setError(json?.message || "Failed to create team");
        return;
      }

      // Get the created team's ID
      const createdTeamId = json?.data?.treasureHuntData;
      if (!createdTeamId) {
        setError("Could not determine Team ID after creation.");
        return;
      }

      // // 2. Initialize team progress in treasure-hunt backend
      // const progressRes = await fetch(`${process.env.NEXT_PUBLIC_TREASURE_API_URL}/api/teams/progress`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Bearer ${token}`,
      //   },
      //   body: JSON.stringify({
      //     teamId: createdTeamId,
      //     pathId: "your-default-path-id", // Replace with actual default path ID
      //   }),
      // });

      // if (!progressRes.ok) {
      //   setError("Team created but failed to initialize game progress.");
      //   return;
      // }

      if (isUpcoming) {
        setSuccess("Registration successful! You will be able to access the game on the day of the event.");
      } else if (isOngoing) {
        setSuccess("Team created successfully!");
        router.push(`/events/treasurehunt/game?teamId=${createdTeamId}`);
      } else {
        setSuccess("Team created. (Event not active yet.)");
      }
    } catch (err: any) {
      setError(err instanceof TypeError ? NETWORK_ERROR_MESSAGE : err?.message || "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setJoinError(null);
    setJoinSuccess(null);
    if (!joinTeamName.trim()) {
      setJoinError("Team name is required.");
      return;
    }
    if (!joinPassword.trim()) {
      setJoinError("Password is required.");
      return;
    }
    if (!treasureEvent?._id) {
      setJoinError("Event not found. Please try again later.");
      return;
    }
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace(LOGIN_URL);
      return;
    }
    setJoining(true);
    try {
      // 1. Join team in main backend
      const res = await authFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/teams/joinExistingTeam`, {
        method: "POST",
        includeTokenInBody: false,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          teamName: joinTeamName.trim(),
          commonPassword: joinPassword
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        clearSession();
        router.replace(LOGIN_URL);
        return;
      }
      if (!res.ok) {
        setJoinError(json?.message || "Failed to join team");
        return;
      }
      // Get the joined team's ID from the updated response structure
      const teamData = json?.data?.team;
      if (!teamData || !teamData._id) {
        setJoinError("Could not determine Team ID after joining.");
        return;
      }
      const joinedTeamId = teamData._id;

      if (isUpcoming) {
        setJoinSuccess("Registration successful! You'll be able to access the game on event day.");
      } else if (isOngoing) {
        setJoinSuccess("Team joined successfully!");
        router.push(`/events/treasurehunt/game?teamId=${joinedTeamId}`);
      } else {
        setJoinSuccess("Team joined. (Event not active yet.)");
      }
    } catch (err: any) {
      setJoinError(err instanceof TypeError ? NETWORK_ERROR_MESSAGE : err?.message || "Something went wrong");
    } finally {
      setJoining(false);
    }
  };

  if (checkingTeam) {
    return (
      <div className="min-h-screen bg-black pt-16 text-cream flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400 mx-auto mb-4"></div>
          <p className="text-sm tracking-wide text-cream/70">Checking existing team...</p>
        </div>
      </div>
    );
  }

  if (teamCheckError) {
    return (
      <div className="min-h-screen bg-black pt-16 text-cream flex items-center justify-center px-4">
        <Navbar />
        <div className="max-w-md w-full bg-black/70 border border-red-600/30 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Couldn't load your registration</h2>
          <p className="text-cream/70 text-sm mb-6">{teamCheckError}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setTeamCheckAttempt((n) => n + 1)}
              className="px-5 py-2 rounded bg-red-600/60 hover:bg-red-600"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => router.push("/events")}
              className="px-5 py-2 rounded bg-black/50 border border-red-600/30 hover:border-red-600/60"
            >
              Back to Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-16 text-cream">
      <Navbar />
      <main className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold">Treasure Hunt 2026</h1>
        <p className="text-cream/70">Team Registration {eventStatus && <span className="ml-2 px-2 py-0.5 text-xs rounded bg-red-600/30 border border-red-600/40">{eventStatus}</span>}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/events")}
              className="px-4 py-2 rounded bg-black/50 border border-red-600/30 hover:border-red-600/60"
            >
              Back to Events
            </button>
          </div>

          {/* Event quick facts */}
          <div className="mb-8 bg-black/70 border border-red-600/30 rounded-xl p-5">
            {eventsError ? (
              <div className="p-3 bg-red-500/10 border border-red-600/30 rounded">Failed to load event.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-cream/85">
                <div className="flex items-center"><Calendar className="text-red-500 mr-2" size={18} /> {treasureEvent?.date || "Date TBA"}</div>
                <div className="flex items-center"><Clock className="text-red-500 mr-2" size={18} /> {treasureEvent?.time || "Time TBA"}</div>
                <div className="flex items-center"><MapPin className="text-red-500 mr-2" size={18} /> {treasureEvent?.location || "Venue TBA"}</div>
              </div>
            )}
          </div>

          {/* ComingSoon notice */}
          {isComingSoon && (
            <div className="mb-12 p-6 bg-black/70 border border-red-600/40 rounded-xl text-center">
              <h2 className="text-xl font-semibold mb-2">Registrations Not Open Yet</h2>
              <p className="text-cream/70 text-sm">Stay tuned. Team creation and joining will open closer to the event date.</p>
            </div>
          )}

          {/* Past notice */}
          {isPast && (
            <div className="mb-12 p-6 bg-black/70 border border-red-600/40 rounded-xl text-center">
              <h2 className="text-xl font-semibold mb-2">Event Concluded</h2>
              <p className="text-cream/70 text-sm">This event has ended. Registrations and team changes are closed.</p>
            </div>
          )}

          {/* Upcoming success state (after create/join) */}
          {isUpcoming && (success || joinSuccess) && (
            <div className="mb-12 p-8 bg-black/80 border border-green-600/30 rounded-xl text-center">
              <h2 className="text-2xl font-serif font-bold mb-4">Registration Confirmed</h2>
              <p className="text-cream/80 mb-4">Your team is registered for the Treasure Hunt.</p>
              <p className="text-cream/60 text-sm mb-6">You will be able to access the game page here once the event starts. Come back on the day of the event!</p>
              <div className="space-y-2">
                <p className="text-green-400/80 text-sm">{success || joinSuccess}</p>
                <button onClick={() => { setSuccess(null); setJoinSuccess(null); setTeamName(""); setTeamPassword(""); setJoinTeamName(""); setJoinPassword(""); }} className="px-4 py-2 text-sm rounded bg-red-600/60 hover:bg-red-600/70">Go back</button>
              </div>
            </div>
          )}

          {/* Two-column layout (hidden if ComingSoon, Past, OR in post-success Upcoming state) */}
          {!isComingSoon && !isPast && !(isUpcoming && (success || joinSuccess)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* New Team */}
            <div className="bg-black/70 border border-red-600/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded bg-red-600/20 flex items-center justify-center border border-red-600/30">
                  <Users size={18} className="text-red-400" />
                </div>
                <h2 className="text-xl font-semibold">New Team</h2>
              </div>
              <p className="text-cream/70 text-sm mb-4 flex items-start"><Info size={16} className="text-red-500 mr-2 mt-0.5"/>Create your team and share the Team ID with your members.</p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-600/30 rounded text-sm">{error}</div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-600/30 rounded text-sm">{success}</div>
              )}

              <form onSubmit={handleCreateTeam} className="space-y-6">
                <div>
                  <label className="block mb-2 text-sm text-cream/80">Team Name</label>
                  <div className="relative">
                    <input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full px-4 py-3 rounded bg-black/70 border border-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-600/40"
                      placeholder="Enter team name"
                      required
                    />
                    <Plus size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40" />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm text-cream/80">Common Password</label>
                  <div className="relative">
                    <input
                      type={showTeamPassword ? "text" : "password"}
                      value={teamPassword}
                      onChange={(e) => setTeamPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded bg-black/70 border border-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-600/40"
                      placeholder="Set a password to share within your team"
                    />
                    <button
                      type="button"
                      aria-label={showTeamPassword ? "Hide password" : "Show password"}
                      aria-pressed={showTeamPassword}
                      onClick={() => setShowTeamPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-cream/60 hover:text-cream/90"
                    >
                      {showTeamPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-cream/50 mt-2">Note: Only share your team password with team members to let them join.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={busy || isLoading || !treasureEvent}
                    className="px-6 py-3 rounded bg-red-600/60 hover:bg-red-600 disabled:opacity-60"
                  >
                    {creating ? "Creating..." : (isUpcoming ? "Register Team" : "Create Team")}
                  </button>
                </div>
              </form>


            </div>

            {/* Join Existing Team */}
            <div className="bg-black/70 border border-red-600/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded bg-red-600/20 flex items-center justify-center border border-red-600/30">
                  <LogIn size={18} className="text-red-400" />
                </div>
                <h2 className="text-xl font-semibold">Join Existing Team</h2>
              </div>
              <p className="text-cream/70 text-sm mb-4 flex items-start"><Info size={16} className="text-red-500 mr-2 mt-0.5"/>Enter the team name to join an existing team.</p>

              {joinError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-600/30 rounded text-sm">{joinError}</div>
              )}
              {joinSuccess && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-600/30 rounded text-sm">{joinSuccess}</div>
              )}

              <form onSubmit={handleJoinTeam} className="space-y-6">
                <div>
                  <label className="block mb-2 text-sm text-cream/80">Team Name</label>
                  <div className="relative">
                    <input
                      value={joinTeamName}
                      onChange={(e) => setJoinTeamName(e.target.value)}
                      className="w-full px-4 py-3 rounded bg-black/70 border border-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-600/40"
                      placeholder="Enter team name"
                      required
                    />
                    <Users size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40" />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm text-cream/80">Team Password (if any)</label>
                  <div className="relative">
                    <input
                      type={showJoinPassword ? "text" : "password"}
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded bg-black/70 border border-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-600/40"
                      placeholder="Provided by your team leader"
                    />
                    <button
                      type="button"
                      aria-label={showJoinPassword ? "Hide password" : "Show password"}
                      aria-pressed={showJoinPassword}
                      onClick={() => setShowJoinPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-cream/60 hover:text-cream/90"
                    >
                      {showJoinPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-cream/50 mt-2">Note: Join your team and track progress with the correct name and password.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={busy || isLoading || !treasureEvent}
                    className="px-6 py-3 rounded bg-red-600/60 hover:bg-red-600 disabled:opacity-60"
                  >
                    {joining ? "Joining..." : (isUpcoming ? "Register & Join" : "Join Team")}
                  </button>
                </div>
              </form>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}