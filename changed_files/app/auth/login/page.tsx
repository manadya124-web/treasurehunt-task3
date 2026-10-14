// app/auth/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/navbar";
import { readNextFromLocation, withNext } from "@/lib/postAuthRedirect";

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Where the user was trying to go before being asked to log in (validated, internal only)
  const [next, setNext] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const requested = readNextFromLocation();
    setNext(requested);
    // Check if user is already logged in
    const token = localStorage.getItem("accessToken");
    if (token) {
      router.push(requested ?? "/profile");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const isEmail = emailOrUsername.includes("@");
    const payload = isEmail
      ? { email: emailOrUsername.trim(), password }
      : { userName: emailOrUsername.trim(), password };

    try {
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      // Email not verified case
      if (data.success === false &&
        data.message === "Email not verified. New verification OTP has been sent."
      ) {
        if (isEmail) {
          localStorage.setItem("email", emailOrUsername.trim());
        }
        router.push(withNext("/auth/verify-email", readNextFromLocation()));
        return;
      }

      if (!response.ok) {
        if (data.field) {
          setErrors({ [data.field]: data.message });
        } else {
          setErrors({ general: data.message || "Login failed. Please check your credentials." });
        }
        return;
      }

      // Success case: store tokens & redirect
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      const destination = readNextFromLocation() ?? "/";
      setTimeout(() => {
          window.location.href = destination;
        }, 500);
    } catch (err: unknown) {
      setErrors({ general: "Network error. Please check your connection and try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-background pt-16">
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            <span className="text-white text-lg font-medium">Signing in...</span>
          </div>
        </div>
      )}
      
      <Navbar />
      
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <form
          onSubmit={handleLogin}
          className="bg-theme-card p-8 rounded-xl shadow-2xl w-full max-w-lg space-y-6 backdrop-blur-sm"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-theme-primary mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to your account</p>
          </div>

          {errors.general && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-red-400 text-sm">{errors.general}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Email or Username
              </label>
              <input
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className={`w-full p-4 rounded-lg bg-black/80 text-white border transition-all duration-300 focus:outline-none focus:ring-2 ${
                  errors.email || errors.userName
                    ? "border-red-500 focus:ring-red-500/50"
                    : "border-gray-600 focus:ring-red-500/50 focus:border-red-500"
                }`}
                placeholder="Enter your email or username"
                required
                disabled={loading}
              />
              {(errors.email || errors.userName) && (
                <p className="mt-2 text-red-400 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.email || errors.userName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full p-4 rounded-lg bg-black/80 text-white border transition-all duration-300 focus:outline-none focus:ring-2 pr-12 ${
                    errors.password
                      ? "border-red-500 focus:ring-red-500/50"
                      : "border-gray-600 focus:ring-red-500/50 focus:border-red-500"
                  }`}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878L21 21m-8.5-2.173L21 21"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-red-400 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 text-white p-4 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] shadow-lg hover:shadow-red-500/25"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </div>

          <div className="text-center space-y-3 pt-4 border-t border-gray-600">
            <div>
              <a 
                href="/auth/forgot-password" 
                className="text-red-400 hover:text-red-300 font-medium transition-colors hover:underline"
              >
                Forgot your password?
              </a>
            </div>
            <p className="text-gray-400">
              Don't have an account?{" "}
              <a href={withNext("/auth/signup", next)} className="text-red-400 hover:text-red-300 font-medium transition-colors hover:underline">
                Sign up here
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
