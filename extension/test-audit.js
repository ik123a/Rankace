/**
 * Headless test harness for extension/content.js audit logic.
 *
 * The extension has never been executed in this project, so its checks are
 * unverified. This loads content.js into a real page (via Playwright), stubs
 * the chrome.* APIs it needs, and asserts on the audit it produces.
 *
 * Run from the frontend workspace where playwright is resolvable:
 *   NODE_PATH=<playwright-root> node ../extension/test-audit.js
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const EXT = __dirname;
const contentJs = fs.readFileSync(path.join(EXT, "content.js"), "utf8");

const FIXTURES = {
  "clean page": `<!doctype html><html><head>
    <title>A Perfectly Optimised Page Title Here</title>
    <meta name="description" content="${"d".repeat(150)}">
    <link rel="canonical" href="https://example.com/clean">
  </head><body>
    <h1>Single H1</h1>
    <h2>Section</h2>
    <p>${"Real sentence content for the page. ".repeat(40)}</p>
    <img src="a.png" alt="A described image" width="100" height="100">
    <a href="/x">Descriptive anchor text here</a>
  </body></html>`,

  "duplicate H1": `<!doctype html><html><head>
    <title>Another Reasonable Page Title Here</title>
    <meta name="description" content="${"d".repeat(150)}">
    <link rel="canonical" href="https://example.com/dup">
  </head><body>
    <h1>First heading</h1><h1>Second heading</h1><h1>Third heading</h1>
    <p>${"Body copy sentence here. ".repeat(40)}</p>
  </body></html>`,

  "many images missing alt": `<!doctype html><html><head>
    <title>Page With Images That Lack Alt Text</title>
    <meta name="description" content="${"d".repeat(150)}">
    <link rel="canonical" href="https://example.com/img">
  </head><body>
    <h1>Gallery</h1>
    ${Array.from({ length: 12 }, (_, i) => `<img src="i${i}.png" width="200" height="200">`).join("")}
    <p>${"Supporting body copy. ".repeat(30)}</p>
  </body></html>`,

  // Ordering regression: 12 CRITICAL defects must score BELOW 3 WARNINGs.
  // Under the old flat-per-check scheme this scored 92 vs the alt fixture's
  // 80 -- the page with far more and more serious problems scored higher.
  "12 missing alt (critical)": `<!doctype html><html><head>
    <title>Page With Images That Lack Alt Text</title>
    <meta name="description" content="${"d".repeat(150)}">
    <link rel="canonical" href="https://example.com/img">
  </head><body>
    <h1>Gallery</h1>
    ${Array.from({ length: 12 }, (_, i) => `<img src="i${i}.png" width="200" height="200">`).join("")}
    <p>${"Supporting body copy. ".repeat(30)}</p>
  </body></html>`,

  "3 duplicate H1 (warning)": `<!doctype html><html><head>
    <title>Another Reasonable Page Title Here</title>
    <meta name="description" content="${"d".repeat(150)}">
    <link rel="canonical" href="https://example.com/dup">
  </head><body>
    <h1>First heading</h1><h1>Second heading</h1><h1>Third heading</h1>
    <p>${"Body copy sentence here. ".repeat(40)}</p>
  </body></html>`,

  // Pill/drawer contradiction: only info-severity findings. The old pill
  // counted critical+warning only, so it said "Clean" beside a drawer full of
  // real findings.
  "only generic anchors (info)": `<!doctype html><html><head>
    <title>Page Using Click Here Links</title>
    <meta name="description" content="${"d".repeat(150)}">
    <link rel="canonical" href="https://example.com/anchors">
  </head><body>
    <h1>Links</h1>
    <a href="/a">click here</a>
    <a href="/b">read more</a>
    <a href="/c">learn more</a>
    <p>${"Body copy sentence here. ".repeat(40)}</p>
  </body></html>`,

  "missing everything": `<!doctype html><html><head></head><body><p>hi</p></body></html>`
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  let failures = 0;
  const check = (name, cond, detail = "") => {
    if (!cond) failures++;
    console.log(`  ${cond ? "ok  " : "FAIL"} ${name}${detail ? "  " + detail : ""}`);
  };

  const scores = {};
  for (const [label, html] of Object.entries(FIXTURES)) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

    // Stub chrome.* BEFORE the content script runs. addInitScript only applies
    // to real navigations, not setContent(), so the stub has to be injected as
    // a script tag first -- otherwise content.js throws "chrome is not defined"
    // at its onMessage registration and nothing after that line executes.
    const chromeStub = `<script>
      window.chrome = window.chrome || {};
      window.chrome.runtime = window.chrome.runtime || {};
      window.chrome.runtime.onMessage = window.chrome.runtime.onMessage || { addListener() {} };
      window.chrome.runtime.sendMessage = function(){ return Promise.resolve({}); };
      window.chrome.runtime.lastError = null;
      window.chrome.runtime.id = "harness";
    </script>`;

    await page.setContent(chromeStub + html, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(150);

    // Inject content.js the way the browser would (as a classic script).
    await page.addScriptTag({ content: contentJs });
    await page.waitForTimeout(1200);

    const audit = await page.evaluate(async () => {
      // Re-run through the extension's own message path so we test the real
      // entry point rather than reaching into internals.
      return new Promise((resolve) => {
        const listeners = [];
        // The script already registered a listener; trigger via the pill click
        // path instead: click the floating pill, which opens the drawer and
        // runs a fresh audit.
        const pill = document.getElementById("rankace-floating-pill");
        if (pill) pill.click();
        setTimeout(() => {
          const drawer = document.getElementById("rankace-inpage-drawer");
          const scoreEl = drawer ? drawer.querySelector(".rankace-score-value") : null;
          const feedHead = drawer ? drawer.querySelector(".rankace-feed-head") : null;
          const cards = drawer ? drawer.querySelectorAll(".rankace-issue-card").length : 0;
          resolve({
            score: scoreEl ? scoreEl.textContent.trim() : null,
            issuesHeader: feedHead ? feedHead.textContent.trim() : null,
            cardsRendered: cards,
            pillText: pill ? pill.innerText.replace(/\s+/g, " ").trim() : null,
            boxes: document.querySelectorAll(".rankace-defect-box").length
          });
        }, 700);
      });
    });

    console.log(`\n--- ${label} ---`);
    console.log(`    score=${audit.score}  cards=${audit.cardsRendered}  boxes=${audit.boxes}`);
    console.log(`    pill="${audit.pillText}"`);
    console.log(`    header="${audit.issuesHeader}"`);
    check(`${label}: no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
    check(`${label}: drawer opened and rendered a score`, audit.score !== null);
    check(
      `${label}: rendered card count matches the header`,
      audit.issuesHeader ? audit.cardsRendered === parseInt(audit.issuesHeader.replace(/\D/g, ""), 10) : false,
      `cards=${audit.cardsRendered} header="${audit.issuesHeader}"`
    );
    check(`${label}: score is an integer 0-100`, /^\d+$/.test(audit.score || "") && +audit.score <= 100 && +audit.score >= 0, `score=${audit.score}`);

    if (label === "clean page") {
      check("clean page scores high (>=85)", +audit.score >= 85, `score=${audit.score}`);
      check("clean page reports no critical issues", audit.cardsRendered === 0, `cards=${audit.cardsRendered}`);
      check("clean page draws no boxes", audit.boxes === 0, `boxes=${audit.boxes}`);
    }
    if (label === "duplicate H1") {
      check("duplicate H1 is detected", audit.cardsRendered > 0, `cards=${audit.cardsRendered}`);
      check("duplicate H1 draws boxes", audit.boxes > 0, `boxes=${audit.boxes}`);
    }
    if (label === "many images missing alt" || label === "12 missing alt (critical)") {
      check(`${label}: 12 missing-alt images are each reported`, audit.cardsRendered >= 12, `cards=${audit.cardsRendered}`);
      scores[label] = +audit.score;
    }
    if (label === "3 duplicate H1 (warning)") {
      check("duplicate H1 is detected", audit.cardsRendered > 0, `cards=${audit.cardsRendered}`);
      check("duplicate H1 draws boxes", audit.boxes > 0, `boxes=${audit.boxes}`);
      scores[label] = +audit.score;
    }
    if (label === "duplicate H1") {
      check("duplicate H1 is detected", audit.cardsRendered > 0, `cards=${audit.cardsRendered}`);
      check("duplicate H1 draws boxes", audit.boxes > 0, `boxes=${audit.boxes}`);
      scores[label] = +audit.score;
    }
    if (label === "only generic anchors (info)") {
      check("info-severity anchors are reported", audit.cardsRendered >= 3, `cards=${audit.cardsRendered}`);
      // The pill bug: totalIssues excluded info, so it read "Clean".
      check(
        "pill does not claim Clean while findings exist",
        !/Clean/.test(audit.pillText || ""),
        `pill="${audit.pillText}"`
      );
      check("pill counts every finding", /4\s*Fixes/.test(audit.pillText || ""), `pill="${audit.pillText}"`);
    }
    if (label === "missing everything") {
      check("empty page scores low (<40)", +audit.score < 40, `score=${audit.score}`);
    }

    await page.close();
  }

  await browser.close();
  console.log("\n=== cross-fixture score ORDERING ===");
  const crit = scores["12 missing alt (critical)"];
  const warn = scores["3 duplicate H1 (warning)"];
  console.log(`  12 CRITICAL defects -> ${crit}`);
  console.log(`  3 WARNING defects   -> ${warn}`);
  check(
    "more and more serious defects score lower",
    crit < warn,
    `${crit} < ${warn}  (was 80 > 92 before the fix)`
  );
  check("a 12-defect page is not 'Excellent'", crit < 65, `score=${crit}`);

  console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(2); });
