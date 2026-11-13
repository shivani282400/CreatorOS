import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { apiFetch, describeError, readJson, setStoredToken } from "../utils/api";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emptyOtp = ["", "", "", "", "", ""];

type AuthConfig = {
  otpEnabled: boolean;
  registrationEnabled: boolean;
  demo: { email: string; password: string } | null;
};

type Mode = "password" | "otp";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 outline-none transition focus:border-purple-400";
const primaryButton =
  "w-full rounded-lg bg-purple-500 py-2.5 font-medium text-white transition-all duration-200 hover:bg-purple-600 disabled:cursor-wait disabled:opacity-40";

export default function Login() {
  const navigate = useNavigate();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [configStatus, setConfigStatus] = useState<"loading" | "ready" | "error">("loading");
  const [slowServer, setSlowServer] = useState(false);

  const [mode, setMode] = useState<Mode>("password");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(emptyOtp);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  // Ask the server which sign-in methods it offers. A sleeping free-tier server can take a while.
  useEffect(() => {
    let cancelled = false;
    const slowTimer = window.setTimeout(() => setSlowServer(true), 2500);

    const load = async () => {
      try {
        const response = await apiFetch("/auth/config");
        const result = await readJson<AuthConfig>(response);
        if (cancelled) return;

        if (response.ok && result) {
          setConfig(result);
          setMode(result.otpEnabled ? "otp" : "password");
          setConfigStatus("ready");
        } else {
          setConfigStatus("error");
        }
      } catch {
        if (!cancelled) setConfigStatus("error");
      } finally {
        window.clearTimeout(slowTimer);
        if (!cancelled) setSlowServer(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  // New accounts and first-time browsers go through onboarding (niche, tone, platform...);
  // returning users with saved preferences, and the demo account, go straight to the dashboard.
  const finishLogin = (token: string, options: { forceOnboarding?: boolean; skipOnboarding?: boolean } = {}) => {
    setStoredToken(token);

    const hasSavedPreferences = Boolean(window.localStorage.getItem("creatorosOnboarding"));
    const goToOnboarding = options.forceOnboarding || (!options.skipOnboarding && !hasSavedPreferences);

    navigate(goToOnboarding ? "/onboarding" : "/dashboard");
  };

  /* ------------------------------ password flow ------------------------------ */

  const submitPassword = async (event?: FormEvent, override?: { email: string; password: string }) => {
    event?.preventDefault();
    const normalizedEmail = (override?.email ?? email).trim().toLowerCase();
    const secret = override?.password ?? password;

    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address");
      return;
    }
    if (!secret) {
      setError("Enter your password");
      return;
    }
    if (isSignUp && !override && secret.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiFetch(isSignUp && !override ? "/auth/register" : "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password: secret })
      });
      const result = await readJson<{ token?: string; error?: string }>(response);

      if (!response.ok || !result?.token) {
        throw new Error(result?.error || (response.status === 429 ? "Too many attempts. Please wait a few minutes." : "Unable to sign in"));
      }

      finishLogin(result.token, {
        forceOnboarding: isSignUp && !override,
        skipOnboarding: Boolean(override)
      });
    } catch (requestError) {
      setError(describeError(requestError, "Unable to sign in"));
    } finally {
      setLoading(false);
    }
  };

  const useDemo = () => {
    if (!config?.demo) return;
    setEmail(config.demo.email);
    setPassword(config.demo.password);
    setIsSignUp(false);
    void submitPassword(undefined, config.demo);
  };

  /* ---------------------------------- OTP flow --------------------------------- */

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail })
      });
      const result = await readJson<{ error?: string; resendAfterSeconds?: number }>(response);
      if (!response.ok) throw new Error(result?.error || "Unable to send a verification code");
      setEmail(normalizedEmail);
      setOtp(emptyOtp);
      setStep("otp");
      setResendSeconds(result?.resendAfterSeconds ?? 60);
      window.setTimeout(() => inputRefs.current[0]?.focus(), 0);
    } catch (requestError) {
      setError(describeError(requestError, "Unable to send a verification code"));
    } finally {
      setLoading(false);
    }
  };

  const updateOtp = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    setOtp(Array.from({ length: 6 }, (_, index) => digits[index] || ""));
    inputRefs.current[Math.min(digits.length, 6) - 1]?.focus();
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Enter the complete six-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code })
      });
      const result = await readJson<{ token?: string; error?: string }>(response);
      if (!response.ok || !result?.token) throw new Error(result?.error || "Unable to verify the code");
      finishLogin(result.token);
    } catch (verificationError) {
      setError(describeError(verificationError, "Unable to verify the code"));
    } finally {
      setLoading(false);
    }
  };

  const backToEmail = () => {
    setStep("email");
    setOtp(emptyOtp);
    setError("");
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setStep("email");
    setError("");
  };

  const otpAvailable = Boolean(config?.otpEnabled);
  const canSignUp = config?.registrationEnabled !== false;
  const showOtpCodeStep = mode === "otp" && step === "otp";

  const heading = showOtpCodeStep ? "Check your email" : isSignUp && mode === "password" ? "Create your account" : "Welcome to CreatorOS";
  const subheading = showOtpCodeStep
    ? `We sent a six-digit code to ${email}.`
    : mode === "otp"
      ? "Enter your email to receive a secure sign-in code."
      : isSignUp
        ? "Use an email and a password of at least 8 characters."
        : "Sign in with your email and password.";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_32%),#0b1020] px-4 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute left-[12%] top-[14%] h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <motion.div animate={{ x: [0, -24, 0], y: [0, 26, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[18%] right-[14%] h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-8 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-200">
              <Sparkles className="h-3.5 w-3.5" />
              CreatorOS Access
            </div>
            <h1 className="text-2xl font-semibold text-white">{heading}</h1>
            <p className="text-sm text-gray-400">{subheading}</p>
          </div>

          {configStatus === "loading" && slowServer ? (
            <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Waking up the server. Free hosting can take up to a minute on the first visit.
            </p>
          ) : null}

          {configStatus === "error" ? (
            <p role="status" className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Couldn't reach the server yet. You can still try signing in, and it will retry the connection.
            </p>
          ) : null}

          {mode === "password" ? (
            <form onSubmit={(event) => void submitPassword(event)} className="space-y-4">
              <input type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
              <input type="password" autoComplete={isSignUp ? "new-password" : "current-password"} placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
              <button type="submit" disabled={loading} className={primaryButton}>
                {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
              </button>

              {config?.demo ? (
                <button type="button" onClick={useDemo} disabled={loading} className="w-full rounded-lg border border-purple-400/30 bg-purple-500/10 py-2.5 text-sm font-medium text-purple-100 transition hover:bg-purple-500/20 disabled:opacity-40">
                  Try the demo account
                </button>
              ) : null}

              {canSignUp ? (
                <p className="text-center text-sm text-gray-400">
                  {isSignUp ? "Already have an account?" : "New here?"}{" "}
                  <button type="button" onClick={() => { setIsSignUp((value) => !value); setError(""); }} className="text-purple-300 hover:text-purple-200">
                    {isSignUp ? "Sign in" : "Create an account"}
                  </button>
                </p>
              ) : null}
            </form>
          ) : step === "email" ? (
            <form onSubmit={sendCode} className="space-y-4">
              <input type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
              <button type="submit" disabled={loading} className={primaryButton}>
                {loading ? "Sending..." : "Send verification code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-5">
              <div className="flex justify-between gap-2" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => { inputRefs.current[index] = element; }}
                    value={digit}
                    onChange={(event) => updateOtp(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    aria-label={`Digit ${index + 1}`}
                    className="h-12 w-12 rounded-lg border border-white/10 bg-white/5 text-center text-xl text-white outline-none transition focus:border-purple-400"
                  />
                ))}
              </div>
              <button type="submit" disabled={loading || otp.join("").length !== 6} className={primaryButton}>
                {loading ? "Verifying..." : "Verify and continue"}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={backToEmail} className="text-gray-400 hover:text-white">Use a different email</button>
                <button type="button" disabled={loading || resendSeconds > 0} onClick={() => void sendCode()} className="text-purple-300 hover:text-purple-200 disabled:text-gray-500">
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {error ? <p role="alert" className="mt-4 text-sm text-red-400">{error}</p> : null}

          {otpAvailable && !showOtpCodeStep ? (
            <button type="button" onClick={() => switchMode(mode === "otp" ? "password" : "otp")} className="mt-5 w-full text-center text-sm text-gray-400 hover:text-white">
              {mode === "otp" ? "Use password instead" : "Use an email code instead"}
            </button>
          ) : null}

          <p className="mt-6 text-center text-xs leading-5 text-gray-500">
            {mode === "otp" ? "A new account is created automatically for a new email. Never share your verification code." : "Your password is never stored in plain text."}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
