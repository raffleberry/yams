import { ref, watch } from "vue";

/**
 * Extracts a dominant accent colour from cover art and exposes it as a CSS
 * custom property so headers and the player bar can pick up the album's mood.
 *
 * Uses a small offscreen canvas, which means the artwork must be same-origin
 * (it is: served from /api/artwork) or CORS-enabled. Failures are silent and
 * simply leave the ambient colour unset.
 */
const AMBIENT = "--ambient";

const cache = new Map<string, string>();

function dominantColor(img: HTMLImageElement): string | null {
  const size = 24;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return null; // tainted canvas
  }

  // Bucket colours by hue and keep the most populous, most saturated bucket.
  const buckets = new Map<number, { r: number; g: number; b: number; n: number; score: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // Skip near-black / near-white pixels; they dominate album covers and
    // would wash the UI out.
    if (max < 24 || min > 232) continue;
    const lightness = (max + min) / 2 / 255;
    const chroma = (max - min) / 255;
    const key = Math.round(r / 48) * 100 + Math.round(g / 48) * 10 + Math.round(b / 48);
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, score: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n += 1;
    bucket.score += (0.35 + chroma) * (1 - Math.abs(lightness - 0.5) * 0.7);
    buckets.set(key, bucket);
  }

  let best: { r: number; g: number; b: number; score: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.score > best.score) {
      best = {
        r: bucket.r / bucket.n,
        g: bucket.g / bucket.n,
        b: bucket.b / bucket.n,
        score: bucket.score,
      };
    }
  }
  if (!best) return null;

  // Normalise to a vivid, mid-lightness tone for use as a background wash.
  const { r, g, b } = best;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  const boost = (v: number) => {
    const nv = 128 + (v - 128) * 1.35;
    return Math.min(255, Math.max(0, Math.round(nv)));
  };
  // Keep it dark enough to sit behind text.
  const mix = (v: number) => Math.round(v * (0.55 + l * 0.25));
  return `color-mix(in oklab, rgb(${mix(boost(r))}, ${mix(boost(g))}, ${mix(boost(b))}) 42%, transparent)`;
}

/**
 * Watch an artwork URL and tint `--ambient` on <html>.
 * Returns a stop function.
 */
export function useAmbientArt(source: () => string | undefined) {
  const current = ref<string | undefined>(undefined);

  const apply = (src: string | undefined) => {
    const root = document.documentElement;
    if (!src) {
      root.style.removeProperty(AMBIENT);
      return;
    }
    const cached = cache.get(src);
    if (cached) {
      root.style.setProperty(AMBIENT, cached);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      const color = dominantColor(img);
      if (color) {
        cache.set(src, color);
        if (current.value === src) root.style.setProperty(AMBIENT, color);
      }
    };
    img.src = src;
  };

  const stop = watch(source, apply, { immediate: true });
  return { current, stop };
}
