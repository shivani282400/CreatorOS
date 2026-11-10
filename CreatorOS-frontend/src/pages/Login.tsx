import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { apiFetch, setStoredToken } from "../utils/api";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

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
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send a verification code");
      setEmail(normalizedEmail);
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      setResendSeconds(result.resendAfterSeconds ?? 60);
      window.setTimeout(() => inputRefs.current[0]?.focus(), 0);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send a verification code");
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
      const result = await response.json();
      if (!response.ok || !result.token) throw new Error(result.error || "Unable to verify the code");
      setStoredToken(result.token);
      navigate("/dashboard");
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Unable to verify the code");
    } finally {
      setLoading(false);
    }
  };

  const backToEmail = () => {
    setStep("email");
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_32%),#0b1020] px-4 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute left-[12%] top-[14%] h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <motion.div animate={{ x: [0, -24, 0], y: [0, 26, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[18%] right-[14%] h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>
      <div className="relative flex min-h-screen items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-purple-500/10 backdrop-blur-xl">
          <div className="mb-8 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-200">CreatorOS Access</div>
            <h1 className="text-2xl font-semibold text-white">{step === "email" ? "Welcome to CreatorOS" : "Check your email"}</h1>
            <p className="text-sm text-gray-400">{step === "email" ? "Enter your email to receive a secure sign-in code." : `We sent a six-digit code to ${email}.`}</p>
          </div>
          {step === "email" ? (
            <form onSubmit={sendCode} className="space-y-4">
              <input type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-purple-500 py-2 font-medium text-white transition-all duration-200 hover:bg-purple-600 disabled:cursor-wait disabled:opacity-40">{loading ? "Sending code..." : "Continue"}</button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-5">
              <div className="flex justify-between gap-2" onPaste={handlePaste}>
                {otp.map((digit, index) => <input key={index} ref={(element) => { inputRefs.current[index] = element; }} value={digit} onChange={(event) => updateOtp(index, event.target.value)} onKeyDown={(event) => handleOtpKeyDown(index, event)} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} aria-label={`Verification digit ${index + 1}`} maxLength={1} className="h-12 w-full rounded-lg border border-white/10 bg-white/5 text-center text-xl font-semibold text-white outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40" />)}
              </div>
              <button type="submit" disabled={loading || otp.join("").length !== 6} className="w-full rounded-lg bg-purple-500 py-2 font-medium text-white transition-all duration-200 hover:bg-purple-600 disabled:cursor-wait disabled:opacity-40">{loading ? "Verifying..." : "Verify and continue"}</button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={backToEmail} className="text-gray-400 hover:text-white">Use a different email</button>
                <button type="button" disabled={loading || resendSeconds > 0} onClick={() => void sendCode()} className="text-purple-300 hover:text-purple-200 disabled:text-gray-500">{resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}</button>
              </div>
            </form>
          )}
          {error ? <p role="alert" className="mt-4 text-sm text-red-400">{error}</p> : null}
          <p className="mt-6 text-center text-xs leading-5 text-gray-500">A new account is created automatically for a new email. Never share your verification code.</p>
        </motion.div>
      </div>
    </div>
  );
}
