// app/auth/signup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/navbar";
import { readNextFromLocation, withNext } from "@/lib/postAuthRedirect";

interface FormData {
  userName: string;
  email: string;
  fullName: string;
  password: string;
}

export default function SignupPage() {
  const [formData, setFormData] = useState<FormData>({
    userName: "",
    email: "",
    fullName: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  // Where the user was trying to go before being asked to sign up (validated, internal only)
  const [next, setNext] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setNext(readNextFromLocation());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (formData.userName.length < 3) {
      newErrors.userName = "Username must be at least 3 characters";
    }
    
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (formData.fullName.length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }
    
    if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setErrors({});

    try {
      console.log(process.env.NEXT_PUBLIC_BACKEND_URL);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.field) {
          setErrors({ [data.field]: data.message });
        } else {
          setErrors({ general: data.message || "Registration failed. Please try again." });
        }
        return;
      }

      localStorage.setItem("email", formData.email);
      router.push(withNext("/auth/verify-email", readNextFromLocation()));
    } catch (err) {
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
            <span className="text-white text-lg font-medium">Creating account...</span>
          </div>
        </div>
      )}
      
      <Navbar />
      
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <form
          onSubmit={handleSignup}
          className="bg-theme-card p-8 rounded-xl shadow-2xl w-full max-w-lg space-y-6 backdrop-blur-sm"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-theme-primary mb-2">Create Account</h1>
            <p className="text-gray-400">Join us today and get started</p>
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
                Username
              </label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleChange}
                className={`w-full p-4 rounded-lg bg-black/80 text-white border transition-all duration-300 focus:outline-none focus:ring-2 ${
                  errors.userName
                    ? "border-red-500 focus:ring-red-500/50"
                    : "border-gray-600 focus:ring-red-500/50 focus:border-red-500"
                }`}
                placeholder="Choose a unique username"
                required
                disabled={loading}
              />
              {errors.userName && (
                <p className="mt-2 text-red-400 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.userName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full p-4 rounded-lg bg-black/80 text-white border transition-all duration-300 focus:outline-none focus:ring-2 ${
                  errors.email
                    ? "border-red-500 focus:ring-red-500/50"
                    : "border-gray-600 focus:ring-red-500/50 focus:border-red-500"
                }`}
                placeholder="Enter your email address"
                required
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-2 text-red-400 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full p-4 rounded-lg bg-black/80 text-white border transition-all duration-300 focus:outline-none focus:ring-2 ${
                  errors.fullName
                    ? "border-red-500 focus:ring-red-500/50"
                    : "border-gray-600 focus:ring-red-500/50 focus:border-red-500"
                }`}
                placeholder="Enter your full name"
                required
                disabled={loading}
              />
              {errors.fullName && (
                <p className="mt-2 text-red-400 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.fullName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full p-4 rounded-lg bg-black/80 text-white border transition-all duration-300 focus:outline-none focus:ring-2 ${
                  errors.password
                    ? "border-red-500 focus:ring-red-500/50"
                    : "border-gray-600 focus:ring-red-500/50 focus:border-red-500"
                }`}
                placeholder="Create a secure password"
                required
                disabled={loading}
              />
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
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </div>

          <div className="text-center pt-4 border-t border-gray-600">
            <p className="text-gray-400">
              Already have an account?{" "}
              <a href={withNext("/auth/login", next)} className="text-red-400 hover:text-red-300 font-medium transition-colors hover:underline">
                Sign in here
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
