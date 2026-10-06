"use client";

import { useEffect, useRef } from "react";

export type VisibilityFieldProps = {
  intensity?: number;
  paused?: boolean;
  className?: string;
};

type Particle = { x: number; y: number; r: number; vx: number; vy: number; a: number };
type Point = { x: number; y: number; z: number };

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const LATITUDES = [-64, -42, -21, 0, 21, 42, 64];
const MERIDIANS = 12;
const NODE_BAND_LAT = 24 * DEG;
const NODE_COUNT = 9;

function clampDpr(value: number): number {
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(2, value);
}

export function VisibilityField({ intensity = 1, paused = false, className }: VisibilityFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const still = paused || reduceMotion;

    let width = 1;
    let height = 1;
    let frame = 0;
    let running = true;
    let deferred = 0;
    const particles: Particle[] = [];
    let volume: CanvasGradient | null = null;
    let rim: CanvasGradient | null = null;

    const seedParticles = () => {
      particles.length = 0;
      const count = Math.round(Math.min(80, Math.max(24, (width * height) / 26000)));
      for (let index = 0; index < count; index += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.1 + 0.3,
          vx: (Math.random() - 0.5) * 0.09,
          vy: -Math.random() * 0.07 - 0.012,
          a: Math.random() * 0.26 + 0.06
        });
      }
    };

    // Canvas cannot resolve var() -- the 2D context parses the colour string
    // itself, so a custom property handed to fillStyle throws at runtime even
    // though it typechecks and builds. Therefore the palette is read back out
    // of the computed style and mirrored into the draw call. `paint` is a
    // mutable holder rebuilt on theme change; `buildGradients` is re-run so
    // cached gradients do not outlive the theme they were built for.
    const paint = {
      particle: "242, 243, 243",
      line: "242, 243, 243",
      backdrop: "24, 20, 26",
      accent: "255,46,107",
      info: "76,154,255"
    };

    // A 3-digit-hex var cannot be expressed as channels, so hex values are
    // converted to "r, g, b" here. getPropertyValue returns whatever the
    // token literally holds -- "#ff2e6b" for the dark accent, "rgb(214, 0,
    // 79)" for the light one -- so both forms have to be handled. Handing
    // the raw hex to addColorStop produced
    // "rgba(ff2e6b,0.24)", which the canvas parser rejects at runtime while
    // tsc and next build both pass.
    const toChannels = (raw: string, fallback: string): string => {
      const value = raw.trim();
      if (!value) return fallback;
      if (value.startsWith("#")) {
        let hex = value.slice(1);
        if (hex.length === 3 || hex.length === 4) hex = hex.split("").map((c) => c + c).join("");
        if (hex.length === 6 || hex.length === 8) {
          const n = parseInt(hex.slice(0, 6), 16);
          if (Number.isFinite(n)) return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
        }
        return fallback;
      }
      const m = value.match(/[\d.]+/g);
      if (m && m.length >= 3) return `${m[0]}, ${m[1]}, ${m[2]}`;
      return fallback;
    };

    const readPaint = () => {
      const cs = getComputedStyle(document.documentElement);
      const pick = (name: string, fallback: string) =>
        (cs.getPropertyValue(name) || "").trim() || fallback;
      paint.particle = toChannels(pick("--canvas-particle", ""), paint.particle);
      paint.line = toChannels(pick("--canvas-line", ""), paint.line);
      paint.backdrop = toChannels(pick("--canvas-backdrop", ""), paint.backdrop);
      paint.accent = toChannels(pick("--accent", ""), paint.accent);
      paint.info = toChannels(pick("--status-info", ""), paint.info);
    };

    const buildGradients = () => {
      const cx = width * 0.5;
      const cy = height * 0.53;
      const radius = Math.min(width, height) * 0.33;

      const glow = ctx.createRadialGradient(
        cx - radius * 0.4,
        cy - radius * 0.45,
        radius * 0.08,
        cx,
        cy,
        radius * 1.12
      );
      // On a light canvas the mid stop cannot stay near-black at 0.5 alpha or
      // it paints a grey bruise over the page, so it is scaled with the
      // backdrop lightness.
      const backdropAlpha = paint.backdrop.startsWith("236") ? 0.22 : 0.5;
      glow.addColorStop(0, `rgba(${paint.accent},0.24)`);
      glow.addColorStop(0.5, `rgba(${paint.backdrop},${backdropAlpha})`);
      glow.addColorStop(1, `rgba(${paint.backdrop},0)`);
      volume = glow;

      const back = ctx.createRadialGradient(
        cx + radius * 0.52,
        cy + radius * 0.58,
        radius * 0.15,
        cx,
        cy,
        radius
      );
      back.addColorStop(0, `rgba(${paint.info},0.13)`);
      back.addColorStop(1, `rgba(${paint.info},0)`);
      rim = back;
    };

    const resize = () => {
      const box = canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(box.width));
      height = Math.max(1, Math.floor(box.height));
      const dpr = clampDpr(window.devicePixelRatio || 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedParticles();
      buildGradients();
    };

    const project = (cx: number, cy: number, radius: number, lat: number, lon: number, spin: number): Point => {
      const cosLat = Math.cos(lat);
      return {
        x: cx + radius * cosLat * Math.sin(lon + spin),
        y: cy + radius * Math.sin(lat),
        z: cosLat * Math.cos(lon + spin)
      };
    };

    const draw = (time: number) => {
      const spin = time * 0.000115 * intensity;
      const cx = width * 0.5;
      const cy = height * 0.53;
      const radius = Math.min(width, height) * 0.33;

      ctx.clearRect(0, 0, width, height);

      for (const particle of particles) {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r, 0, TAU);
        ctx.fillStyle = `rgba(${paint.particle},${particle.a})`;
        ctx.fill();
        if (!still) {
          particle.x += particle.vx;
          particle.y += particle.vy;
          if (particle.y < -4) {
            particle.y = height + 4;
            particle.x = Math.random() * width;
          }
          if (particle.x < -4) particle.x = width + 4;
          if (particle.x > width + 4) particle.x = -4;
        }
      }

      if (volume) {
        ctx.fillStyle = volume;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.12, 0, TAU);
        ctx.fill();
      }

      if (rim) {
        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, TAU);
        ctx.fill();
      }

      ctx.lineWidth = 1;

      for (const latDegrees of LATITUDES) {
        const lat = latDegrees * DEG;
        let previous = project(cx, cy, radius, lat, 0, spin);
        for (let step = 1; step <= 48; step += 1) {
          const current = project(cx, cy, radius, lat, (step / 48) * TAU, spin);
          const depth = Math.max(0, (previous.z + current.z) * 0.5);
          if (depth > 0) {
            ctx.beginPath();
            ctx.moveTo(previous.x, previous.y);
            ctx.lineTo(current.x, current.y);
            ctx.strokeStyle = `rgba(${paint.line},${(0.05 + depth * 0.16).toFixed(3)})`;
            ctx.stroke();
          }
          previous = current;
        }
      }

      for (let meridian = 0; meridian < MERIDIANS; meridian += 1) {
        const lon = (meridian / MERIDIANS) * TAU;
        let previous = project(cx, cy, radius, -Math.PI / 2, lon, spin);
        for (let step = 1; step <= 26; step += 1) {
          const lat = -Math.PI / 2 + (step / 26) * Math.PI;
          const current = project(cx, cy, radius, lat, lon, spin);
          const depth = Math.max(0, (previous.z + current.z) * 0.5);
          if (depth > 0) {
            ctx.beginPath();
            ctx.moveTo(previous.x, previous.y);
            ctx.lineTo(current.x, current.y);
            ctx.strokeStyle = `rgba(${paint.line},${(0.04 + depth * 0.12).toFixed(3)})`;
            ctx.stroke();
          }
          previous = current;
        }
      }

      for (let index = 0; index < NODE_COUNT; index += 1) {
        const lon = (index / NODE_COUNT) * TAU + spin * 1.9;
        const point = project(cx, cy, radius, NODE_BAND_LAT, lon, spin);
        if (point.z <= 0) continue;
        const glow = 0.35 + point.z * 0.65;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1.6 + point.z * 2.4, 0, TAU);
        ctx.fillStyle = `rgba(${paint.accent},${(glow * 0.9).toFixed(3)})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5 + point.z * 8, 0, TAU);
        ctx.strokeStyle = `rgba(${paint.accent},${(glow * 0.22).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const loop = (time: number) => {
      if (!running) return;
      draw(time);
      frame = window.requestAnimationFrame(loop);
    };

    // Read the live palette before the first build so the field matches the
    // theme the inline script already applied, rather than the dark defaults.
    readPaint();
    resize();

    const observer = new ResizeObserver(() => resize());
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    // Gradients are cached objects, so a theme switch leaves the previously
    // built ones in place -- the field would keep painting the old palette
    // until a resize happened to rebuild them. Watch the attribute and
    // repaint immediately. `attributeFilter` keeps this off every unrelated
    // attribute mutation on <html>.
    const themeWatcher = new MutationObserver(() => {
      readPaint();
      buildGradients();
      draw(0);
    });
    themeWatcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });

    let visible = true;
    const intersection = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.01 }
    );
    intersection.observe(canvas);

    if (still) {
      draw(0);
    } else {
      draw(0);
      deferred = window.requestAnimationFrame(() => {
        deferred = window.requestAnimationFrame(() => {
          if (running) frame = window.requestAnimationFrame(loop);
        });
      });
    }

    const tick = window.setInterval(() => {
      if (!still && !visible && running) {
        running = false;
        window.cancelAnimationFrame(frame);
      } else if (!still && visible && !running) {
        running = true;
        frame = window.requestAnimationFrame(loop);
      }
    }, 220);

    return () => {
      running = false;
      window.clearInterval(tick);
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(deferred);
      observer.disconnect();
      intersection.disconnect();
      themeWatcher.disconnect();
    };
  }, [intensity, paused]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
