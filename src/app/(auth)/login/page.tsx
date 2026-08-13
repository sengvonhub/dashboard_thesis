"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/app/redux";
import { setCredentials } from "@/state/authSlice";
import { LoginFormValues, loginSchema } from "@/state/validation/auth/authvalidation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLoginMutation } from "@/state/tageTypes/services/authApi";
import { api } from "@/state/api";
import { AtSign, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const result = await login(values).unwrap();
      // Drop anything cached under the previous session before the new token
      // lands — otherwise a second account logging in on this browser can read
      // the last user's cached users/company data until each query refetches.
      // Ordered before setCredentials so no in-flight request is discarded.
      dispatch(api.util.resetApiState());
      dispatch(
        setCredentials({
          accessToken: result.access_token,
          // Without the expiry the session can never be detected as stale, and
          // without the user there are no permissions to gate the UI on.
          accessExpiresIn: result.access_expires_in,
          user: result.user,
        })
      );
      // AuthGuard appends ?next=… when it bounces someone out of the dashboard.
      // Read it from the URL directly rather than via useSearchParams, which
      // would force this page into a Suspense boundary.
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
    } catch {
      setError("root", { message: "Invalid username or password. Please try again." });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0D1117] text-[#E8ECF4] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm">
        <div className="relative overflow-hidden rounded-2xl border border-[#2A3350] bg-[#1C2333] p-6 sm:p-8">
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{
              background: "linear-gradient(90deg, #6D28D9 0%, #7C6FF7 50%, #4338CA 100%)",
            }}
          />

          <span className="inline-block text-[11px] font-mono tracking-widest text-[#7C6FF7] uppercase mb-4">
            Sign in
          </span>
          <h1 className="text-2xl font-semibold text-[#E8ECF4] tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-[#8892B0]">
            Enter your details to access your workspace.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5A6480]">
                  <AtSign className="h-4 w-4" />
                </span>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Username"
                  {...register("username")}
                  className="w-full rounded-xl bg-[#161B27] border border-[#2A3350] pl-10 pr-3 py-3 text-sm text-[#E8ECF4] placeholder-[#5A6480] focus:border-[#7C6FF7] focus:outline-none focus:ring-1 focus:ring-[#7C6FF7]"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-[#F87171]">{errors.username.message}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5A6480]">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password"
                  {...register("password")}
                  className="w-full rounded-xl bg-[#161B27] border border-[#2A3350] pl-10 pr-10 py-3 text-sm text-[#E8ECF4] placeholder-[#5A6480] focus:border-[#7C6FF7] focus:outline-none focus:ring-1 focus:ring-[#7C6FF7]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5A6480] hover:text-[#E8ECF4]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-[#F87171]">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <div className="rounded-xl bg-[#F8717126] border border-[#F87171]/40 p-3 text-xs text-[#F87171]">
                {errors.root.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#7C6FF7] focus:ring-offset-2 focus:ring-offset-[#1C2333] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #6D28D9 0%, #7C6FF7 50%, #4338CA 100%)",
              }}
            >
              {isLoading ? "Signing in..." : "Sign in"}
              {!isLoading && (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#8892B0]">
            Registering a company?{" "}
            <Link href="/register" className="font-medium text-[#7C6FF7] hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}