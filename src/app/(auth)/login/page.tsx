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




import { AtSign, Lock, Eye, EyeOff } from "lucide-react";
import AuthShell, {
  AuthError,
  AuthField,
  AuthSubmit,
} from "@/app/(components)/Auth/AuthShell";

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
      dispatch(api.util.resetApiState());
      dispatch(
        setCredentials({
          accessToken: result.access_token,
          accessExpiresIn: result.access_expires_in,
          user: result.user,
        })
      );
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
    } catch {
      setError("root", { message: "Invalid username or password. Please try again." });
    }
  };

  return (






    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Enter your details to access your workspace."
      footer={
        <>
          Registering a company?{" "}
          <Link
            href="/register"
            className="font-medium hover:underline"
            style={{ color: "var(--color-blurple)" }}
          >
            Create one
          </Link>
        </>
      }
    >











      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <AuthField
          icon={AtSign}
          id="username"
          type="text"
          autoComplete="username"
          placeholder="Username"
          error={errors.username?.message}
          {...register("username")}
        />

        <div>
          <div className="relative">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--color-text-muted)" }}
            >
              <Lock className="h-4 w-4" />
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              {...register("password")}
              className="w-full rounded-xl border pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-1"
              style={{
                background: "var(--color-surface-card)",
                borderColor: errors.password
                  ? "var(--color-error)"
                  : "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-text-muted)" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-error)" }}>
              {errors.password.message}
            </p>
          )}
        </div>

        {errors.root && <AuthError message={errors.root.message ?? ""} />}

        <AuthSubmit
          loading={isLoading}
          label="Sign in"
          loadingLabel="Signing in..."
        />
      </form>



    </AuthShell>
  );
}
