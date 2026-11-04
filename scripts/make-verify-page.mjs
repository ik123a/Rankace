// Builds extension/_verify.html: a deliberately broken page with the real
// content.js inlined, so the auto-fix engine can be driven in a plain browser.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentJs = fs.readFileSync(path.join(root, "extension", "content.js"), "utf8");

const noAltImgs = Array.from({ length: 8 }, (_, i) =>
  `<img src="gallery/photo-${i}.png" width="300" height="200">`
).join("\n    ");

const fixture = `<!doctype html>
<html>
<head>
  <!-- deliberately missing: title, meta description, canonical, lang, viewport, charset, robots -->
</head>
<body>
  <h1>Rankace Auto-Fix Verification Page</h1>
  <h1>Duplicate H1 that should be demoted</h1>
  <p>${"This is real body copy used to derive a meta description. ".repeat(6)}</p>
  <div class="gallery">
    ${noAltImgs}
  </div>
  <a href="https://example.com/pricing" target="_blank">Pricing details</a>
  <a href="/about">click here</a>
  <p>hi</p>
</body>
</html>`;

const chromeStub = `<script>
  window.chrome = window.chrome || {};
  window.chrome.runtime = window.chrome.runtime || {};
  window.chrome.runtime.onMessage = window.chrome.runtime.onMessage || { addListener() {} };
  window.chrome.runtime.sendMessage = function () { return Promise.resolve({}); };
  window.chrome.runtime.lastError = null;
  window.chrome.runtime.id = "verify-harness";
  // Capture the corrected-file blob instead of downloading it -- otherwise
  // every automated verification click pops a Windows Save-As dialog.
  window.__capturedHtml = null;
  const realCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function (blob) {
    if (blob && typeof blob.text === "function") { blob.text().then((t) => { window.__capturedHtml = t; }); }
    return realCreate(blob);
  };
  const realAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute("download")) return; // harness: no Save-As dialog
    return realAnchorClick.apply(this, arguments);
  };
</script>`;

// Callback replacement: content.js contains $& / $' sequences (even in
// comments), which a plain-string replacement would expand and corrupt.
const html = fixture.replace("</head>", () => chromeStub + "\n<script>\n" + contentJs + "\n</script>\n</head>");

fs.writeFileSync(path.join(root, "extension", "_verify.html"), html);
console.log("wrote extension/_verify.html", html.length, "bytes");