import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { apiUrl, setStoredToken } from "../utils/api"

export default function Login() {
  const navigate = useNavigate()

  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const isDisabled =
    loading ||
    !email.trim() ||
    !password.trim() ||
    (isSignup && !confirmPassword.trim())

  const handleSubmit = async (e:any) => {
    e.preventDefault()

    if (isSignup && password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch(apiUrl(isSignup ? "/auth/register" : "/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      })

      const result = await res.json()

      if (!res.ok || !result.token) {
        throw new Error(result.error || "Authentication failed")
      }

      setStoredToken(result.token)
      navigate("/onboarding")
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_32%),#0b1020] px-4 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[12%] top-[14%] h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -24, 0], y: [0, 26, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[18%] right-[14%] h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl"
        />
      </div>

      <div className="relative flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-purple-500/10 backdrop-blur-xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            className="mb-8 space-y-2"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-200">
              CreatorOS Access
            </div>

            <h1 className="text-2xl font-semibold text-white">
              Welcome to CreatorOS
            </h1>

            <p className="text-sm text-gray-400 mt-1">
              Build, optimize and schedule content with AI
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.input
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.3 }}
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />

            <motion.input
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.3 }}
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />

            <AnimatePresence initial={false}>
              {isSignup ? (
                <motion.input
                  key="confirm-password"
                  initial={{ opacity: 0, y: 8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.25 }}
                  type="password"
                  placeholder="Confirm Password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              ) : null}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {error ? (
                <motion.p
                  key={error}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 text-xs text-red-400"
                >
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.3 }}
              whileHover={isDisabled ? undefined : { scale: 1.01, y: -1 }}
              whileTap={isDisabled ? undefined : { scale: 0.985 }}
              disabled={isDisabled}
              className="w-full mt-4 rounded-lg bg-purple-500 py-2 font-medium text-white transition-all duration-200 hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (isSignup ? "Creating account..." : "Signing in...") : isSignup ? "Create Account" : "Sign In"}
            </motion.button>
          </form>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.3 }}
            className="mt-6 text-center text-sm text-gray-400"
          >

            {isSignup ? "Already have an account?" : "Don't have an account?"}

            <motion.button
              whileHover={{ opacity: 0.9 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsSignup(!isSignup)}
              className="ml-2 text-purple-300 transition-colors duration-200 hover:text-purple-200"
            >
              {isSignup ? "Login" : "Sign Up"}
            </motion.button>

          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
