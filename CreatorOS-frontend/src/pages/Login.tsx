import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function Login() {

  const navigate = useNavigate()

  const [isSignup, setIsSignup] = useState(false)

  const handleSubmit = (e:any) => {
    e.preventDefault()

    // later this will connect to backend
    navigate("/onboarding")
  }

  return (

    <div className="min-h-screen bg-[#0E0F13] flex items-center justify-center text-white">

      <div className="bg-[#151821] p-10 rounded-2xl w-[420px]">

        <h1 className="text-2xl font-bold mb-2">
          CreatorOS
        </h1>

        <p className="text-gray-400 mb-8">
          Your AI content operating system
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="email"
            placeholder="Email"
            required
            className="w-full bg-[#1D212B] p-3 rounded-lg"
          />

          <input
            type="password"
            placeholder="Password"
            required
            className="w-full bg-[#1D212B] p-3 rounded-lg"
          />

          {isSignup && (
            <input
              type="password"
              placeholder="Confirm Password"
              required
              className="w-full bg-[#1D212B] p-3 rounded-lg"
            />
          )}

          <button
            className="w-full bg-blue-500 py-3 rounded-lg mt-2"
          >
            {isSignup ? "Create Account" : "Login"}
          </button>

        </form>

        <p className="text-sm text-gray-400 mt-6 text-center">

          {isSignup ? "Already have an account?" : "Don't have an account?"}

          <button
            onClick={() => setIsSignup(!isSignup)}
            className="ml-2 text-blue-400"
          >
            {isSignup ? "Login" : "Sign Up"}
          </button>

        </p>

      </div>

    </div>

  )

}