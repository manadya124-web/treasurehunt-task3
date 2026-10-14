// app/auth/verify-email/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { readNextFromLocation, withNext } from "@/lib/postAuthRedirect";

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const storedEmail = localStorage.getItem("email");
    if (!storedEmail) {
      router.push(withNext("/auth/login", readNextFromLocation()));
      return;
    }
    setEmail(storedEmail);
  }, [router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          otp: otp.trim(), 
          email: localStorage.getItem("email") 
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid OTP or verification failed");
      }

      // Auto-login: Store tokens from verification response
      if (data.data?.accessToken && data.data?.refreshToken) {
        localStorage.setItem("accessToken", data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken);
        localStorage.removeItem("email"); // Clean up
        
        // Show success and redirect to the saved destination (default: profile)
        const destination = readNextFromLocation() ?? "/profile";
        setTimeout(() => {
          window.location.href = destination;
        }, 500);
      } else {
        const loginUrl = withNext("/auth/login", readNextFromLocation());
        setTimeout(() => {
          window.location.href = loginUrl;
        }, 500);
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (countdown > 0) return;
    
    try {
      setCountdown(60);
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: localStorage.getItem("email") }),
      });
    } catch (err) {
      setError("Failed to resend OTP");
      setCountdown(0);
    }
  };

  return (
    <div className="min-h-screen bg-theme-background pt-16">
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            <span className="text-white text-lg font-medium">Verifying email...</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-lg">
          <div className="bg-theme-card p-8 rounded-xl shadow-2xl backdrop-blur-sm">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-theme-primary mb-3">Verify Your Email</h1>
              <p className="text-gray-400 text-lg">
                We sent a verification code to
              </p>
              <p className="text-white font-medium text-lg">{email}</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-3">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full p-4 text-center text-2xl tracking-widest rounded-lg bg-black/80 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-300"
                  placeholder="000000"
                  maxLength={6}
                  required
                  disabled={loading}
                />
                <p className="text-gray-400 text-sm mt-2 text-center">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-red-500 hover:bg-red-600 text-white p-4 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] shadow-lg hover:shadow-red-500/25"
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>

              <div className="text-center space-y-2">
                <p className="text-gray-400 text-sm">Didn't receive the code?</p>
                <button
                  type="button"
                  onClick={resendOTP}
                  disabled={countdown > 0}
                  className="text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
