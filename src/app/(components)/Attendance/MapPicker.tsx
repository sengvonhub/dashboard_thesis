"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Crosshair, Loader2, Minus, MousePointerClick, Plus, X } from "lucide-react";

/**
 * Dependency-free OpenStreetMap tile picker, laid out for desktop: a centred
 * modal with the map on the left and a detail sidebar on the right, rather
 * than the full-bleed sheet a phone would use. It collapses to a single
 * column under `md`.
 *
 * Built from raw tiles rather than pulling in Leaflet — the requirement is
 * "show a map, drop a pin, read the lat/lng back", which is a little Web
 * Mercator maths, and it avoids adding a map library plus its CSS.
 *
 * Tiles come from OpenStreetMap's public servers, whose usage policy requires
 * visible attribution (rendered bottom-right) and low volume. For production
 * traffic, point TILE_URL at your own tile server or a paid provider.
 */

const TILE_SIZE = 256;
const TILE_URL = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

// ── Web Mercator ─────────────────────────────────────────
const lngToWorldX = (lng: number, z: number) =>
  ((lng + 180) / 360) * TILE_SIZE * 2 ** z;

const latToWorldY = (lat: number, z: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (
    (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE_SIZE * 2 ** z
  );
};

const worldXToLng = (x: number, z: number) =>
  (x / (TILE_SIZE * 2 ** z)) * 360 - 180;

const worldYToLat = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / (TILE_SIZE * 2 ** z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

export default function MapPicker({
  initialLat,
  initialLng,
  radiusMeters,
  onConfirm,
  onClose,
}: {
  initialLat: number;
  initialLng: number;
  radiusMeters?: number;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(16);
  const [pin, setPin] = useState({ lat: initialLat, lng: initialLng });
  // Map centre, kept separate from the pin so panning does not move the pin.
  const [center, setCenter] = useState({ lat: initialLat, lng: initialLng });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Free text so a half-typed "11." doesn't get clobbered mid-keystroke.
  const [latText, setLatText] = useState(initialLat.toFixed(6));
  const [lngText, setLngText] = useState(initialLng.toFixed(6));

  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const movePin = useCallback((lat: number, lng: number, recenter = false) => {
    setPin({ lat, lng });
    setLatText(lat.toFixed(6));
    setLngText(lng.toFixed(6));
    if (recenter) setCenter({ lat, lng });
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const centerWorldX = lngToWorldX(center.lng, zoom);
  const centerWorldY = latToWorldY(center.lat, zoom);
  const originX = centerWorldX - size.w / 2;
  const originY = centerWorldY - size.h / 2;

  const pointToLatLng = useCallback(
    (px: number, py: number) => ({
      lat: worldYToLat(originY + py, zoom),
      lng: worldXToLng(originX + px, zoom),
    }),
    [originX, originY, zoom]
  );

  const latLngToPoint = useCallback(
    (lat: number, lng: number) => ({
      x: lngToWorldX(lng, zoom) - originX,
      y: latToWorldY(lat, zoom) - originY,
    }),
    [originX, originY, zoom]
  );

  // ── tiles covering the viewport ────────────────────────
  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  if (size.w && size.h) {
    const max = 2 ** zoom;
    const x0 = Math.floor(originX / TILE_SIZE);
    const y0 = Math.floor(originY / TILE_SIZE);
    const x1 = Math.floor((originX + size.w) / TILE_SIZE);
    const y1 = Math.floor((originY + size.h) / TILE_SIZE);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        if (y < 0 || y >= max) continue;
        const wrapped = ((x % max) + max) % max;
        tiles.push({
          key: `${zoom}/${x}/${y}`,
          url: TILE_URL(zoom, wrapped, y),
          left: x * TILE_SIZE - originX,
          top: y * TILE_SIZE - originY,
        });
      }
    }
  }

  // ── drag to pan ────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX,
      originY,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
    if (!d.moved) return;
    const nx = d.originX - dx + size.w / 2;
    const ny = d.originY - dy + size.h / 2;
    setCenter({ lat: worldYToLat(ny, zoom), lng: worldXToLng(nx, zoom) });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.moved) return; // a drag, not a click
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = pointToLatLng(e.clientX - rect.left, e.clientY - rect.top);
    movePin(next.lat, next.lng);
  };

  const useMyLocation = () => {
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        movePin(pos.coords.latitude, pos.coords.longitude, true);
        setLocating(false);
      },
      () => {
        setError("Could not read your location. Check location permission.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  /** Commit a typed coordinate, if it parses. */
  const commitTyped = () => {
    const la = Number(latText);
    const ln = Number(lngText);
    if (
      Number.isFinite(la) && la >= -90 && la <= 90 &&
      Number.isFinite(ln) && ln >= -180 && ln <= 180
    ) {
      setPin({ lat: la, lng: ln });
      setCenter({ lat: la, lng: ln });
      setError(null);
    } else {
      setError("Those coordinates are out of range.");
    }
  };

  const pinPoint = latLngToPoint(pin.lat, pin.lng);
  const metresPerPixel =
    (156543.03392 * Math.cos((pin.lat * Math.PI) / 180)) / 2 ** zoom;
  const radiusPx = radiusMeters ? radiusMeters / metresPerPixel : 0;

  const fieldStyle = {
    background: "var(--color-surface)",
    borderColor: "var(--color-border)",
    color: "var(--color-text-primary)",
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set office location"
        className="w-full max-w-5xl h-[82vh] rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: "var(--color-surface-elevated)",
          borderColor: "var(--color-border)",
          boxShadow: "0 32px 80px -32px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div
          className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <h2
            className="flex-1 text-base font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Set office location
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* body: map + sidebar */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <div
            ref={boxRef}
            className="relative flex-1 min-h-0 overflow-hidden touch-none select-none cursor-crosshair"
            style={{ background: "#E8EAED" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (dragRef.current = null)}
          >
            {tiles.map((t) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={t.key}
                src={t.url}
                alt=""
                draggable={false}
                className="absolute pointer-events-none"
                style={{ left: t.left, top: t.top, width: TILE_SIZE, height: TILE_SIZE }}
              />
            ))}

            {/* allowed-radius circle */}
            {radiusPx > 0 && radiusPx < 4000 && (
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: pinPoint.x - radiusPx,
                  top: pinPoint.y - radiusPx,
                  width: radiusPx * 2,
                  height: radiusPx * 2,
                  background: "color-mix(in srgb, var(--color-blurple) 16%, transparent)",
                  border: "2px solid var(--color-blurple)",
                }}
              />
            )}

            {/* pin */}
            <div
              className="absolute pointer-events-none"
              style={{ left: pinPoint.x - 9, top: pinPoint.y - 9 }}
            >
              <div
                className="h-[18px] w-[18px] rounded-full"
                style={{
                  background: "var(--color-blurple)",
                  border: "3px solid #FFFFFF",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                }}
              />
            </div>

            {/* hint */}
            <div
              className="absolute top-3 left-3 px-3 py-2 rounded-lg text-xs pointer-events-none inline-flex items-center gap-2"
              style={{
                background: "var(--color-surface-elevated)",
                color: "var(--color-text-secondary)",
              }}
            >
              <MousePointerClick className="h-3.5 w-3.5" />
              Click the map to place the office pin · drag to pan
            </div>

            {/* zoom */}
            <div className="absolute right-3 top-3 flex flex-col rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(19, z + 1))}
                aria-label="Zoom in"
                className="h-8 w-8 flex items-center justify-center"
                style={{ background: "var(--color-surface-elevated)", color: "var(--color-text-primary)" }}
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(3, z - 1))}
                aria-label="Zoom out"
                className="h-8 w-8 flex items-center justify-center border-t"
                style={{
                  background: "var(--color-surface-elevated)",
                  color: "var(--color-text-primary)",
                  borderColor: "var(--color-divider)",
                }}
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>

            {/* OSM attribution — required by their tile usage policy */}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="absolute right-1 bottom-0 text-[10px] px-1"
              style={{ background: "rgba(255,255,255,0.75)", color: "#222" }}
              onClick={(e) => e.stopPropagation()}
            >
              © OpenStreetMap
            </a>
          </div>

          {/* sidebar */}
          <aside
            className="w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l flex flex-col"
            style={{
              borderColor: "var(--color-divider)",
              background: "var(--color-surface-card)",
            }}
          >
            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-wide mb-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Selected location
                </p>

                <label className="flex flex-col gap-1 mb-2">
                  <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    Latitude
                  </span>
                  <input
                    value={latText}
                    onChange={(e) => setLatText(e.target.value)}
                    onBlur={commitTyped}
                    onKeyDown={(e) => e.key === "Enter" && commitTyped()}
                    inputMode="decimal"
                    className="rounded-lg border px-3 py-2 text-sm focus:outline-none"
                    style={fieldStyle}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    Longitude
                  </span>
                  <input
                    value={lngText}
                    onChange={(e) => setLngText(e.target.value)}
                    onBlur={commitTyped}
                    onKeyDown={(e) => e.key === "Enter" && commitTyped()}
                    inputMode="decimal"
                    className="rounded-lg border px-3 py-2 text-sm focus:outline-none"
                    style={fieldStyle}
                  />
                </label>
              </div>

              {radiusMeters ? (
                <div
                  className="rounded-lg px-3 py-2.5"
                  style={{ background: "var(--color-info-tint)" }}
                >
                  <p className="text-xs" style={{ color: "var(--color-info)" }}>
                    Check-in allowed within <strong>{radiusMeters} m</strong> of this
                    pin — shown as the shaded circle.
                  </p>
                </div>
              ) : null}

              {error && (
                <p className="text-xs" style={{ color: "var(--color-error)" }}>
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold border disabled:opacity-60"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
                Use my current location
              </button>
            </div>

            {/* footer actions — web convention: bottom-right, primary last */}
            <div
              className="mt-auto p-5 border-t flex items-center justify-end gap-2"
              style={{ borderColor: "var(--color-divider)" }}
            >
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold border"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(pin.lat, pin.lng)}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: "var(--color-blurple)",
                  color: "var(--color-on-accent)",
                }}
              >
                <Check className="h-4 w-4" />
                Use this location
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
