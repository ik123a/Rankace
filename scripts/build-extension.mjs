/**
 * Build the downloadable extension bundle.
 *
 * Why a script instead of hand-copying files into frontend/public/:
 * a copy rots silently. Someone edits extension/content.js, forgets the
 * public copy, and the site ships a build of the OLD extension with no error
 * anywhere. This regenerates the served copy and the zip from the source of
 * truth, and asserts the two agree afterwards.
 *
 * The Playwright test harness (extension/test-audit.js) is deliberately NOT
 * shipped -- it is a development gate, and there is no reason to hand visitors
 * a file that requires a browser automation runtime to run.
 *
 * Usage:
 *   node scripts/build-extension.mjs
 *   node scripts/build-extension.mjs --check   # verify without writing
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "extension");
const OUT = join(ROOT, "frontend", "public", "download", "rankace-extension");
const CHECK_ONLY = process.argv.includes("--check");

// Files the browser actually loads. Anything not listed here is dev-only and
// stays out of the download.
const SHIPPED_FILES = [
  "manifest.json",
  "background.js",
  "content.js",
  "overlay.css",
  "sidepanel.html",
  "sidepanel.js",
  "README.md"
];
const SHIPPED_ICONS = ["icon16.png", "icon48.png", "icon128.png"];

// Files that must NOT reach the public directory.
const EXCLUDED = ["test-audit.js", "node_modules", ".DS_Store"];

const readManifestVersion = () => {
  const raw = readFileSync(join(SRC, "manifest.json"), "utf8");
  // Chrome manifests are strict JSON, but tolerate a BOM/CRLF from Windows.
  return JSON.parse(raw.replace(/^﻿/, "")).version;
};

const version = readManifestVersion();
const zipName = `rankace-extension-v${version}.zip`;

console.log(`Rankace extension v${version}`);
console.log(`  source: ${SRC}`);
console.log(`  output: ${OUT}`);

// ---- 1. Sanity-check the source before shipping it -----------------------
const missing = SHIPPED_FILES.filter((f) => !existsSync(join(SRC, f)));
if (missing.length) {
  console.error(`\nERROR: missing source files: ${missing.join(", ")}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(SRC, "manifest.json"), "utf8").replace(/^﻿/, ""));
const declared = [
  ...(manifest.content_scripts || []).flatMap((cs) => [...(cs.js || []), ...(cs.css || [])]),
  manifest.background?.service_worker,
  manifest.side_panel?.default_path,
  ...Object.values(manifest.action?.default_icon || {}),
  ...Object.values(manifest.icons || {})
].filter(Boolean);

const unshipped = declared.filter((f) => !existsSync(join(SRC, f)));
if (unshipped.length) {
  console.error(`\nERROR: manifest references files that do not exist: ${unshipped.join(", ")}`);
  process.exit(1);
}
console.log(`  manifest references ${declared.length} files, all present`);

// A manifest whose version disagrees with the filename would silently serve a
// stale zip to someone who bookmarked a URL.
console.log(`  zip will be: ${zipName}`);

if (CHECK_ONLY) {
  console.log("\n--check: nothing written.");
  process.exit(0);
}

// ---- 2. Rebuild the served copy from scratch ------------------------------
// rm first so a file deleted from the source cannot linger in public/.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "icons"), { recursive: true });

for (const f of SHIPPED_FILES) {
  writeFileSync(join(OUT, f), readFileSync(join(SRC, f)));
}
for (const f of SHIPPED_ICONS) {
  writeFileSync(join(OUT, "icons", f), readFileSync(join(SRC, "icons", f)));
}
console.log(`  copied ${SHIPPED_FILES.length} files + ${SHIPPED_ICONS.length} icons`);

// ---- 3. Prove the served copy matches the source --------------------------
// A copy that silently diverges is the exact failure this script exists to
// prevent, so it is checked rather than assumed.
let mismatches = 0;
for (const f of [...SHIPPED_FILES, ...SHIPPED_ICONS.map((i) => join("icons", i))]) {
  const a = readFileSync(join(SRC, f.includes("/") ? f : f));
  const b = readFileSync(join(OUT, f));
  if (!a.equals(b)) {
    console.error(`  MISMATCH: ${f}`);
    mismatches++;
  }
}
if (mismatches) {
  console.error(`\nERROR: ${mismatches} served file(s) differ from source.`);
  process.exit(1);
}
console.log("  verified: served copy is byte-identical to source");

// ---- 4. Confirm nothing excluded leaked into public/ ---------------------
const shipped = [];
(function walk(dir, base = "") {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, `${base}${entry}/`);
    else shipped.push(`${base}${entry}`);
  }
})(OUT);

const leaked = shipped.filter((f) => EXCLUDED.some((e) => f.includes(e)));
if (leaked.length) {
  console.error(`\nERROR: dev-only files leaked into the download: ${leaked.join(", ")}`);
  process.exit(1);
}
console.log(`  verified: ${shipped.length} files shipped, 0 dev-only leaks`);

// ---- 5. Produce the zip ---------------------------------------------------
// Chrome needs a REAL zip. Two traps, both hit and verified here:
//
//  1. `tar -a` does NOT produce a zip on this machine. It ships GNU tar 1.35,
//     which has no zip writer at all: `-a` (auto-compress by extension)
//     silently emitted a TAR under a .zip name. The server then returned
//     `application/zip`, 200, and 133120 bytes -- so a status-only check
//     passed -- while the first bytes were "rank", not "PK". Downloaded by a
//     visitor, that file cannot be unpacked.
//  2. Passing an ABSOLUTE Windows path to tar makes it fail differently,
//     because GNU tar reads the drive-letter colon as a remote-host specifier.
//
// So: use the `zip` binary (present at /c/.../miktex/bin/zip), and verify the
// PK magic bytes on the RESULT rather than trusting an exit code. An archive
// is the one artifact here that a wrong format hides perfectly well.
const zipPath = join(ROOT, "frontend", "public", "download", zipName);
try {
  if (existsSync(zipPath)) rmSync(zipPath);
  execFileSync("zip", ["-r", "-q", zipName, "rankace-extension"], {
    cwd: join(ROOT, "frontend", "public", "download"),
    stdio: "pipe"
  });
  const bytes = readFileSync(zipPath);
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
  const isTar = bytes.subarray(257, 262).toString("latin1") === "ustar";
  console.log(`  zipped  ${zipName} (${(bytes.length / 1024).toFixed(1)} KB)`);
  if (isTar) {
    console.error("\nERROR: the archive is a TAR, not a zip (ustar magic at 257).");
    console.error("       tar cannot write zip; use the `zip` binary instead.");
    process.exit(1);
  }
  if (!isZip) {
    console.error(`\nERROR: not a zip -- first bytes are ${JSON.stringify(bytes.subarray(0, 8).toString("latin1"))}`);
    process.exit(1);
  }
  if (bytes.length < 2000) {
    console.error("\nERROR: zip is implausibly small; the archive is probably empty.");
    process.exit(1);
  }
  console.log("  verified: PK zip magic correct (not a disguised tar)");
} catch (err) {
  console.warn(`  zip step FAILED: ${err.message.split("\n")[0]}`);
  console.warn("  the unpacked directory is still served, so the page still works");
  process.exitCode = 1;
}

console.log("\nDone.");
