import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import PageWrapper from "../components/PageWrapper";
import { authFetch, clearStoredToken } from "../utils/api";

type UserProfile = {
  id: number
  email: string
  niche: string | null
  tone: string | null
  platform: string | null
  created_at: string
}

const nicheOptions = [
  "Fashion & Lifestyle",
  "Business",
  "Education",
  "Technology",
  "Marketing",
  "Fitness",
  "Travel"
];

const toneOptions = [
  "Funny",
  "Bold",
  "Informative",
  "Aesthetic",
  "Luxury",
  "Relatable"
];

const platformOptions = [
  "Instagram",
  "YouTube",
  "TikTok",
  "X",
  "LinkedIn",
  "Threads"
];

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [niche, setNiche] = useState("Fashion & Lifestyle");
  const [tone, setTone] = useState("Funny");
  const [platform, setPlatform] = useState("Instagram");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authFetch("/user/profile");
        const result = await res.json();

        if (!res.ok || !result.data) {
          throw new Error(result.error || "Failed to load profile");
        }

        const profile = result.data as UserProfile;

        setUser(profile);
        setNiche(profile.niche || "Fashion & Lifestyle");
        setTone(profile.tone || "Funny");
        setPlatform(profile.platform || "Instagram");
      } catch (profileError) {
        setError(profileError instanceof Error ? profileError.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSavePreferences = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await authFetch("/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          niche,
          tone,
          platform
        })
      });

      const result = await res.json();

      if (!res.ok || !result.data) {
        throw new Error(result.error || "Failed to save preferences");
      }

      const updatedProfile = result.data as UserProfile;

      setUser(updatedProfile);
      setSuccess("Preferences saved");
      window.localStorage.setItem(
        "creator_profile",
        JSON.stringify({
          niche: updatedProfile.niche,
          tone: updatedProfile.tone,
          platform: updatedProfile.platform
        })
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearStoredToken();
    localStorage.removeItem("creator_profile");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <MainLayout>
      <PageWrapper>
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              Profile
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-white">Profile</h1>
              <p className="text-sm text-gray-400">
                Manage your account and creator preferences
              </p>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : null}

          {success ? (
            <p className="text-sm text-emerald-400">{success}</p>
          ) : null}

          <div className="glass-panel rounded-2xl border border-white/10 p-5">
            <h2 className="mb-3 text-white font-medium">Account</h2>

            <p className="text-sm text-gray-400">Email</p>
            <p className="text-white">
              {loading ? "Loading..." : user?.email || "No email available"}
            </p>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 p-5 space-y-4">
            <h2 className="text-white font-medium">Creator Preferences</h2>

            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-purple-500/40"
            >
              {nicheOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-purple-500/40"
            >
              {toneOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-purple-500/40"
            >
              {platformOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <button
              onClick={handleSavePreferences}
              disabled={saving}
              className="w-full rounded-lg bg-[#7c3aed] px-4 py-2.5 text-white transition-all duration-200 hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 p-5 space-y-3">
            <h2 className="text-white font-medium">Settings</h2>

            <button
              onClick={handleLogout}
              className="text-sm text-red-400 transition-colors duration-200 hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </div>
      </PageWrapper>
    </MainLayout>
  );
}
