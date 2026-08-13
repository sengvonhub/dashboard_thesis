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
  AtSign,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
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

  const slug = useMemo(
    () => (companyCode || "your-code").toLowerCase().replace(/[^a-z0-9-]/g, ""),
    [companyCode]
  );

  const onSubmit = async (values: RegisterCompanyFormValues) => {
    try {
      const { confirmPassword: _confirmPassword, ...payload } = values;

      const result = await registerCompany(payload).unwrap();

      // authSlice now stores refresh token + expiry timestamps alongside
      // the access token.
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
    <div className="min-h-screen w-full bg-[#0D1117] text-[#E8ECF4] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
        {/* ---------- Left: live preview ---------- */}
        <div className="relative overflow-hidden rounded-2xl border border-[#2A3350] bg-[#1C2333] p-6 sm:p-8 flex flex-col justify-between">
          <div
            className="absolute inset-0 opacity-[0.15] pointer-events-none"
            style={{
              background: "linear-gradient(135deg, #6D28D9 0%, #7C6FF7 50%, #4338CA 100%)",
            }}
          />
          <div className="relative">
            <span className="inline-block text-[11px] font-mono tracking-widest text-[#7C6FF7] uppercase mb-4">
              New workspace
            </span>
            <h1 className="text-2xl font-semibold text-[#E8ECF4] tracking-tight leading-snug">
              {companyName || "Untitled company"}
            </h1>
            <p className="mt-1 text-sm font-mono text-[#8892B0]">
              bizcore.app/<span className="text-[#7C6FF7]">{slug}</span>
            </p>

            <div className="mt-8 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#5A6480]">Admin</span>
                <span className="font-mono text-[#E8ECF4]">{adminUsername || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5A6480]">Plan</span>
                <span className="font-mono text-[#E8ECF4]">Assigned on creation</span>
              </div>
            </div>
          </div>

          <p className="relative mt-10 text-xs text-[#5A6480] leading-relaxed">
            Plan, status, and seat limit are set by the server — you're
            signed in automatically once the workspace is created.
          </p>
        </div>

        {/* ---------- Right: form ---------- */}
        <div className="rounded-2xl border border-[#2A3350] bg-[#1C2333] p-5 sm:p-8">
          {errors.root && (
            <div className="mb-5 rounded-xl bg-[#F8717126] border border-[#F87171]/40 p-3 text-xs text-[#F87171]">
              {errors.root.message}
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
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5A6480]">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Password"
                      {...register("admin_password")}
                      className="w-full rounded-xl bg-[#161B27] border border-[#2A3350] pl-10 pr-10 py-3 text-sm text-[#E8ECF4] placeholder-[#5A6480] focus:border-[#7C6FF7] focus:outline-none focus:ring-1 focus:ring-[#7C6FF7]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5A6480] hover:text-[#E8ECF4]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.admin_password && (
                    <p className="mt-1 text-xs text-[#F87171]">{errors.admin_password.message}</p>
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

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#7C6FF7] focus:ring-offset-2 focus:ring-offset-[#1C2333] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #6D28D9 0%, #7C6FF7 50%, #4338CA 100%)",
              }}
            >
              {isLoading ? "Creating workspace..." : "Create workspace"}
              {!isLoading && (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#8892B0]">
            Already registered?{" "}
            <Link href="/login" className="font-medium text-[#7C6FF7] hover:underline">
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
        <span className="text-[11px] font-mono text-[#5A6480]">{index}</span>
        <h2 className="text-xs font-semibold tracking-wider text-[#7C6FF7] uppercase">{title}</h2>
        <div className="h-px flex-1 bg-[#2A3350]" />
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
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5A6480] [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
        <input
          type={type}
          placeholder={placeholder}
          {...registration}
          className="w-full rounded-xl bg-[#161B27] border border-[#2A3350] pl-10 pr-3 py-3 text-sm text-[#E8ECF4] placeholder-[#5A6480] focus:border-[#7C6FF7] focus:outline-none focus:ring-1 focus:ring-[#7C6FF7]"
        />
      </div>
      {error && <p className="mt-1 text-xs text-[#F87171]">{error}</p>}
    </div>
  );
}