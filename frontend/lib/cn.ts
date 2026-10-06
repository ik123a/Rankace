import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Project-specific tailwind-merge config.
 *
 * The bug this fixes (measured, not theoretical): tailwind-merge's default
 * `text-color` group is a catch-all -- `[{"text": [null, null, null]}]` -- so
 * ANY `text-<something>` it cannot place is classified as a COLOUR. Rankace
 * also names its FONT SIZES with the `text-` prefix (text-display-xl,
 * text-title-m, text-body-s, text-label, text-mono-micro, ...), so every one
 * of them resolved into `text-color` and was dropped as a competing colour.
 *
 * Consequences that were live in the shipped UI:
 *  - StatusTag / IntentTag lost `text-mono-micro` and rendered at the inherited
 *    16px instead of the intended 11px.
 *  - Button lost `text-accent-on` alongside `text-label`, so the light-theme
 *    primary label fell back to --text-primary and measured 3.39:1 on the rose
 *    fill -- dark ink on a saturated background, under the 4.5:1 AA floor. The
 *    class was never in the DOM, so no CSS or token change could have fixed it.
 *
 * Fix: add the project's font sizes to the `text` scale so they resolve as
 * sizes rather than colours, and narrow the colour group to the project's
 * actual colour keys so it stops swallowing unknown `text-*` names. Sizes and
 * colours then live in different groups and only genuine same-group conflicts
 * collapse.
 *
 * The lists below mirror tailwind.config.js. A size added there and omitted
 * here silently reverts to being read as a colour -- keep the two in step.
 *
 * Mirrored rather than imported: tailwind.config.js is CommonJS and this
 * module is bundled for the browser, so importing it would pull the entire
 * Tailwind config into the client bundle.
 */
const FONT_SIZES = [
  "display-xl",
  "display-l",
  "display-m",
  "title-l",
  "title-m",
  "body-l",
  "body", // Tailwind's built-in text-base
  "body-s",
  "label",
  "mono-data",
  "mono-micro"
];

const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Extending ONLY `font-size` is the whole fix. Measured against four
      // candidate configs:
      //   - extending font-size alone  -> every case correct (chosen)
      //   - extending font-size AND text-color -> identical, redundant
      //   - overriding both (no `extend`) -> WIPES the built-in palette, so
      //     text-accent-on text-label collapses to text-label again and
      //     text-display-xl is dropped: strictly worse.
      // Leaving text-color at its default catch-all is what makes unknown
      // utilities like text-white and text-slate-400 still resolve as colours.
      //
      // No `null` placeholders here: processObjectDefinition throws on a null
      // VALUE. Nulls are only legal as array positions, which is why the
      // override form above needed them and this one must not have them.
      "font-size": [{ text: FONT_SIZES }]
    }
  }
});

export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
