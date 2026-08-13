"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  MapPin,
  QrCode,
  X,
} from "lucide-react";
import { useAuth } from "@/state/tageTypes/lib/hook";
import {
  useScanAuthenticateMutation,
  useScanCheckInMutation,
  useScanCheckOutMutation,
} from "@/state/tageTypes/services/attendanceApi";
import type { ScanResponse } from "@/state/types/attendance";

// ── BarcodeDetector ──────────────────────────────────────
// Native QR decoding, not yet in lib.dom's types. Available in Chrome and
// Android WebView; Safari and Firefox do not ship it, hence the manual-entry
// fallback below.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts?: {
  formats?: string[];
}) => BarcodeDetectorLike;

const getBarcodeDetector = (): BarcodeDetectorCtor | undefined =>
  (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;

type Step = "password" | "scan" | "done";
export type ScanMode = "in" | "out";

const apiMessage = (err: unknown, fallback: string) => {
  const detail = (err as { data?: { detail?: unknown } })?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  return fallback;
};

export default function ScanDialog({
  mode,
  onClose,
}: {
  mode: ScanMode;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const companyId = typeof user?.company_id === "number" ? user.company_id : null;

  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [scanToken, setScanToken] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [detectorAvailable, setDetectorAvailable] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  // Guards against the detect loop firing twice for one QR.
  const submittingRef = useRef(false);

  const [authenticate, { isLoading: authing }] = useScanAuthenticateMutation();
  const [checkIn, { isLoading: checkingIn }] = useScanCheckInMutation();
  const [checkOut, { isLoading: checkingOut }] = useScanCheckOutMutation();
  const submitting = checkingIn || checkingOut;

  const stopCamera = useCallback(() => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  // ── step 1 ────────────────────────────────────────────
  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await authenticate({ password }).unwrap();
      setScanToken(res.scan_token);
      setPassword("");
      setStep("scan");
      setStatus(
        `Token valid for ${Math.round(res.expires_in_secs / 60)} minutes.`
      );
    } catch (err) {
      setError(apiMessage(err, "Password rejected. Try again."));
    }
  };

  // ── step 2 ────────────────────────────────────────────
  const readPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("This device has no location support."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });

  const submitScan = useCallback(
    async (officeQrToken: string) => {
      if (submittingRef.current || !scanToken) return;
      submittingRef.current = true;
      setError(null);

      try {
        if (companyId === null) {
          throw new Error("No company on your session. Sign in again.");
        }

        setStatus("Getting your location...");
        const pos = await readPosition();

        setStatus("Submitting...");
        const payload = {
          scan_token: scanToken,
          office_qr_token: officeQrToken,
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude),
          company_id: companyId,
        };

        const res =
          mode === "in"
            ? await checkIn(payload).unwrap()
            : await checkOut(payload).unwrap();

        stopCamera();
        setResult(res);
        setStep("done");
      } catch (err) {
        const geo = err as GeolocationPositionError;
        if (geo && typeof geo.code === "number") {
          setError(
            geo.code === 1
              ? "Location permission denied — attendance needs your GPS position."
              : "Could not read your location. Move somewhere with a clearer signal."
          );
        } else if (err instanceof Error && !("data" in err)) {
          setError(err.message);
        } else {
          setError(apiMessage(err, "Scan failed. Try again."));
        }
        setStatus(null);
      } finally {
        submittingRef.current = false;
      }
    },
    [scanToken, companyId, mode, checkIn, checkOut, stopCamera]
  );

  const startCamera = async () => {
    setError(null);
    const Detector = getBarcodeDetector();
    if (!Detector) {
      setDetectorAvailable(false);
      setError(
        "This browser cannot decode QR codes. Enter the office code manually below."
      );
      return;
    }

    try {
      // `environment` asks for the rear camera on phones.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraOn(true);
      setStatus("Point the camera at the office QR code.");

      // The <video> only exists once cameraOn flips, so attach on the next tick.
      setTimeout(async () => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});

        const detector = new Detector({ formats: ["qr_code"] });
        loopRef.current = window.setInterval(async () => {
          if (submittingRef.current || video.readyState < 2) return;
          try {
            const codes = await detector.detect(video);
            if (codes.length > 0 && codes[0].rawValue) {
              submitScan(codes[0].rawValue);
            }
          } catch {
            // A transient decode failure per frame is normal; keep polling.
          }
        }, 350);
      }, 0);
    } catch {
      setError(
        "Camera permission denied. Allow camera access, or enter the office code manually."
      );
    }
  };

  const busy = authing || submitting;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "in" ? "Check in" : "Check out"}
        className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl border"
        style={{
          background: "var(--color-surface-elevated)",
          borderColor: "var(--color-border)",
          boxShadow: "0 24px 64px -24px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--color-success-tint)" }}
          >
            <QrCode className="h-5 w-5" style={{ color: "var(--color-success)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {mode === "in" ? "Check in" : "Check out"}
            </h2>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {step === "password"
                ? "Step 1 of 2 — confirm your password"
                : step === "scan"
                ? "Step 2 of 2 — scan the office QR"
                : "Done"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* STEP 1 */}
          {step === "password" && (
            <form onSubmit={submitPassword} className="flex flex-col gap-4">
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Re-enter your password to unlock scanning. The token it returns is
                short-lived.
              </p>
              <label className="flex flex-col gap-1.5">
                <span
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Password
                </span>
                <div className="relative">
                  <KeyRound
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--color-text-muted)" }}
                  />
                  <input
                    type="password"
                    value={password}
                    autoFocus
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm focus:outline-none"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
              </label>

              {error && (
                <p className="text-xs" style={{ color: "var(--color-error)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!password || busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{
                  background: "var(--color-blurple)",
                  color: "var(--color-on-accent)",
                }}
              >
                {authing && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue
              </button>
            </form>
          )}

          {/* STEP 2 */}
          {step === "scan" && (
            <div className="flex flex-col gap-4">
              <div
                className="rounded-xl overflow-hidden flex items-center justify-center aspect-square"
                style={{ background: "var(--color-surface-card)" }}
              >
                {cameraOn ? (
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 p-6 text-center">
                    <Camera
                      className="h-8 w-8"
                      style={{ color: "var(--color-text-muted)" }}
                    />
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      The camera stays off until you start it.
                    </p>
                    <button
                      onClick={startCamera}
                      className="rounded-xl px-4 py-2 text-sm font-semibold"
                      style={{
                        background: "var(--color-blurple)",
                        color: "var(--color-on-accent)",
                      }}
                    >
                      Open scanner
                    </button>
                  </div>
                )}
              </div>

              {status && !error && (
                <p
                  className="text-xs flex items-center gap-1.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {status}
                </p>
              )}

              {error && (
                <p className="text-xs" style={{ color: "var(--color-error)" }}>
                  {error}
                </p>
              )}

              {/* Fallback for browsers with no BarcodeDetector, or a dead camera */}
              {(!detectorAvailable || !cameraOn) && (
                <div className="flex flex-col gap-2">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Or enter the office code
                  </span>
                  <div className="flex gap-2">
                    <input
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Paste office QR token"
                      className="flex-1 min-w-0 rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                    <button
                      onClick={() => submitScan(manualToken.trim())}
                      disabled={!manualToken.trim() || submitting}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold shrink-0 disabled:opacity-50"
                      style={{
                        background: "var(--color-blurple)",
                        color: "var(--color-on-accent)",
                      }}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DONE */}
          {step === "done" && result && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center"
                style={{ background: "var(--color-success-tint)" }}
              >
                <CheckCircle2
                  className="h-7 w-7"
                  style={{ color: "var(--color-success)" }}
                />
              </div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {result.message}
              </p>
              <p
                className="text-xs flex items-center gap-1.5"
                style={{ color: "var(--color-text-muted)" }}
              >
                <MapPin className="h-3 w-3" />
                {result.distance_meters}m from the office
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {mode === "in"
                  ? `Checked in at ${result.attendance.check_in_time ?? "—"}`
                  : `Checked out at ${result.attendance.check_out_time ?? "—"}`}
              </p>
              <button
                onClick={onClose}
                className="mt-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
                style={{
                  background: "var(--color-blurple)",
                  color: "var(--color-on-accent)",
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
