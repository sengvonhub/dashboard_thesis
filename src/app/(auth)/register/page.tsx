"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Hash,
  Mail,
  Phone,
  MapPin,
  User,
  Users,
  AtSign,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  AuthError,
  AuthLogo,
  AuthSubmit,
} from "@/app/(components)/Auth/AuthShell";
import { useAppDispatch } from "@/app/redux";
import { setCredentials } from "@/state/authSlice";
import { RegisterCompanyFormValues, registerCompanySchema } from "@/state/validation/auth/authvalidation";
import { useRegisterCompanyMutation } from "@/state/tageTypes/services/companyApi";

export default function RegisterCompanyPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [registerCompany, { isLoading }] = useRegisterCompanyMutation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<RegisterCompanyFormValues>({
    resolver: zodResolver(registerCompanySchema),
  });

  const companyName = watch("company_name");
  const companyCode = watch("company_code");
  const adminUsername = watch("admin_username");
  const maxUsers = watch("max_users");

  const slug = useMemo(
    () => (companyCode || "your-code").toLowerCase().replace(/[^a-z0-9-]/g, ""),
    [companyCode]
  );

  const onSubmit = async (values: RegisterCompanyFormValues) => {
    try {
      const { confirmPassword: _confirmPassword, ...payload } = values;

      const result = await registerCompany(payload).unwrap();
      dispatch(
        setCredentials({
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          accessExpiresIn: result.access_expires_in,
          refreshExpiresIn: result.refresh_expires_in,
        })
      );
      router.push("/dashboard");
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } };
      setError("root", {
        message: apiError?.data?.message || "Could not create workspace. Please try again.",
      });
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10"
      style={{ background: "var(--color-bg)", color: "var(--color-text-primary)" }}
    >
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
        {/* ---------- Left: live preview ---------- */}
        <div
          className="relative overflow-hidden rounded-2xl border p-6 sm:p-8 flex flex-col justify-between"
          style={{
            background: "var(--color-surface-elevated)",
            borderColor: "var(--color-border)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.12] pointer-events-none"
            style={{ background: "var(--gradient-brand)" }}
          />
          <div className="relative">
            <AuthLogo size={48} />
            <span
              className="block text-[11px] font-mono tracking-widest uppercase mt-4 mb-2"
              style={{ color: "var(--color-blurple)" }}
            >
              New workspace
            </span>
            <h1
              className="text-2xl font-semibold tracking-tight leading-snug"
              style={{ color: "var(--color-text-primary)" }}
            >
              {companyName || "Untitled company"}
            </h1>
            <p
              className="mt-1 text-sm font-mono"
              style={{ color: "var(--color-text-secondary)" }}
            >
              bizcore.app/
              <span style={{ color: "var(--color-blurple)" }}>{slug}</span>
            </p>

            <div className="mt-8 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--color-text-muted)" }}>Admin</span>
                <span
                  className="font-mono"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {adminUsername || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--color-text-muted)" }}>Max users</span>
                <span
                  className="font-mono"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {maxUsers ? maxUsers : "Unlimited"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--color-text-muted)" }}>Plan</span>
                <span
                  className="font-mono"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Assigned on creation
                </span>
              </div>
            </div>
          </div>

          <p
            className="relative mt-10 text-xs leading-relaxed"
            style={{ color: "var(--color-text-muted)" }}
          >
            Plan, status, and seat limit are set by the server — you&apos;re
            signed in automatically once the workspace is created.
          </p>
        </div>

        {/* ---------- Right: form ---------- */}
        <div
          className="rounded-2xl border p-5 sm:p-8"
          style={{
            background: "var(--color-surface-elevated)",
            borderColor: "var(--color-border)",
          }}
        >
          {errors.root && (
            <div className="mb-5">
              <AuthError message={errors.root.message ?? ""} />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-7" noValidate>
            <FormSection index="01" title="Company">
              <Field
                icon={<Building2 />}
                placeholder="Company name"
                error={errors.company_name?.message}
                registration={register("company_name")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  icon={<Hash />}
                  placeholder="Company code"
                  error={errors.company_code?.message}
                  registration={register("company_code")}
                />
                <Field
                  icon={<Mail />}
                  type="email"
                  placeholder="Company email"
                  error={errors.email?.message}
                  registration={register("email")}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  icon={<Phone />}
                  placeholder="Phone (optional)"
                  error={errors.phone?.message}
                  registration={register("phone")}
                />
                <Field
                  icon={<MapPin />}
                  placeholder="Address (optional)"
                  error={errors.address?.message}
                  registration={register("address")}
                />
              </div>
              <Field
                icon={<Users />}
                type="number"
                placeholder="Max users (optional)"
                error={errors.max_users?.message}
                registration={register("max_users", { valueAsNumber: true })}
              />  
            </FormSection>

            <FormSection index="02" title="Admin account">
              <Field
                icon={<User />}
                placeholder="Full name"
                error={errors.admin_full_name?.message}
                registration={register("admin_full_name")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  icon={<AtSign />}
                  placeholder="Username"
                  error={errors.admin_username?.message}
                  registration={register("admin_username")}
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
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Password"
                      {...register("admin_password")}
                      className="w-full rounded-xl border pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-1"
                      style={{
                        background: "var(--color-surface-card)",
                        borderColor: errors.admin_password
                          ? "var(--color-error)"
                          : "var(--color-border)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.admin_password && (
                    <p className="mt-1 text-xs" style={{ color: "var(--color-error)" }}>
                      {errors.admin_password.message}
                    </p>
                  )}
                </div>
              </div>
              <Field
                icon={<Lock />}
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                error={errors.confirmPassword?.message}
                registration={register("confirmPassword")}
              />
            </FormSection>

            <AuthSubmit
              loading={isLoading}
              label="Create workspace"
              loadingLabel="Creating workspace..."
            />
          </form>

          <p
            className="mt-6 text-center text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Already registered?{" "}
            <Link
              href="/login"
              className="font-medium hover:underline"
              style={{ color: "var(--color-blurple)" }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function FormSection({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-mono"
          style={{ color: "var(--color-text-muted)" }}
        >
          {index}
        </span>
        <h2
          className="text-xs font-semibold tracking-wider uppercase"
          style={{ color: "var(--color-blurple)" }}
        >
          {title}
        </h2>
        <div
          className="h-px flex-1"
          style={{ background: "var(--color-divider)" }}
        />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  icon,
  type = "text",
  placeholder,
  error,
  registration,
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registration: any;
}) {
  return (
    <div>
      <div className="relative">
        <span
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none [&>svg]:h-4 [&>svg]:w-4"
          style={{ color: "var(--color-text-muted)" }}
        >
          {icon}
        </span>
        <input
          type={type}
          placeholder={placeholder}
          {...registration}
          className="w-full rounded-xl border pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-1"
          style={{
            background: "var(--color-surface-card)",
            borderColor: error ? "var(--color-error)" : "var(--color-border)",
            color: "var(--color-text-primary)",
          }}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}
    </div>
  );
}