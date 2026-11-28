import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const FRONTEND_DIR = path.join(ROOT, "frontend");
const BACKEND_DIR = path.join(ROOT, "backend");
const EXT_DIR = path.join(ROOT, "extension");
const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
];

const require = createRequire(import.meta.url);
const puppeteer = require(path.join(FRONTEND_DIR, "node_modules/puppeteer-core"));

const children = [];

function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(600);
    socket.on("connect", () => { socket.destroy(); resolve(true); });
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
    socket.on("error", () => { resolve(false); });
  });
}

async function waitForHttp(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function commandWorks(cmd, args) {
  try {
    const out = spawnSync(cmd, args, { stdio: "ignore", shell: false, timeout: 4000 });
    return out.status === 0;
  } catch {
    return false;
  }
}

async function ensureBackend() {
  if (await isPortOpen(8000)) {
    console.log("[RankAce] Backend already running on http://127.0.0.1:8000");
    return true;
  }

  // Option 1: Docker Compose (if Docker Desktop daemon is running)
  if (commandWorks("docker", ["info"])) {
    console.log("[RankAce] Starting backend services via Docker Compose...");
    const res = spawnSync("docker", ["compose", "up", "-d", "db", "redis", "api"], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (res.status === 0 && (await waitForHttp("http://127.0.0.1:8000/health", 30000))) {
      console.log("[RankAce] Backend ready via Docker on http://127.0.0.1:8000");
      return true;
    }
  }

  // Option 2: Local Python / .venv uvicorn
  const venvPy = path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe");
  const pyCmd = fs.existsSync(venvPy)
    ? venvPy
    : commandWorks("python", ["--version"])
      ? "python"
      : commandWorks("py", ["-3", "--version"])
        ? "py"
        : null;

  if (pyCmd) {
    const envFile = path.join(ROOT, ".env");
    const envExample = path.join(ROOT, ".env.example");
    if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envFile);
    }
    const baseArgs = pyCmd === "py" ? ["-3"] : [];
    const hasUvicorn = commandWorks(pyCmd, [...baseArgs, "-c", "import uvicorn, fastapi"]);
    if (hasUvicorn) {
      console.log("[RankAce] Starting FastAPI backend with", pyCmd, "...");
      const proc = spawn(pyCmd, [...baseArgs, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"], {
        cwd: BACKEND_DIR,
        stdio: "ignore",
      });
      children.push(proc);
      if (await waitForHttp("http://127.0.0.1:8000/health", 20000)) {
        console.log("[RankAce] Backend ready on http://127.0.0.1:8000");
        return true;
      }
    } else {
      console.log("[RankAce] Python found without backend dependencies; run 'pip install -r backend/requirements.txt' to enable crawling/auth.");
    }
  } else {
    console.log("[RankAce] Python/Docker not detected — launching Web App (Demo + Intent API) & Chrome Extension.");
  }
  return false;
}

async function ensureFrontend() {
  if (await isPortOpen(3000)) {
    console.log("[RankAce] Frontend already running on http://127.0.0.1:3000");
    return true;
  }

  if (!fs.existsSync(path.join(FRONTEND_DIR, "node_modules"))) {
    console.log("[RankAce] Installing frontend dependencies...");
    spawnSync("npm.cmd", ["install"], { cwd: FRONTEND_DIR, stdio: "inherit", shell: true });
  }
  if (!fs.existsSync(path.join(FRONTEND_DIR, ".next", "BUILD_ID"))) {
    console.log("[RankAce] Building Next.js production bundle...");
    spawnSync("npm.cmd", ["run", "build"], { cwd: FRONTEND_DIR, stdio: "inherit", shell: true });
  }

  console.log("[RankAce] Starting RankAce Frontend on http://127.0.0.1:3000 ...");
  const proc = spawn("cmd.exe", ["/c", "npx", "next", "start", "-p", "3000", "-H", "127.0.0.1"], {
    cwd: FRONTEND_DIR,
    stdio: "ignore",
  });
  children.push(proc);
  const ok = await waitForHttp("http://127.0.0.1:3000/", 30000);
  if (!ok) throw new Error("Frontend failed to respond on http://127.0.0.1:3000");
  console.log("[RankAce] Frontend ready at http://127.0.0.1:3000");
  return true;
}

function cleanupProcesses() {
  for (const child of children) {
    try {
      if (child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {}
  }
}

async function main() {
  const chromePath = CHROME_CANDIDATES.find((p) => p && fs.existsSync(p));
  if (!chromePath) throw new Error("Google Chrome was not found in standard install paths.");

  const backendUp = await ensureBackend();
  await ensureFrontend();

  const profileDir = path.join(process.env.LOCALAPPDATA || ROOT, "Rankace", "chrome-profile");
  fs.mkdirSync(profileDir, { recursive: true });

  console.log("[RankAce] Launching Chrome with RankAce Visual SEO Extension...");
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: null,
    pipe: true,
    enableExtensions: [EXT_DIR],
    userDataDir: profileDir,
    args: [
      "--no-first-run",
      "--no-default-browser-check",
      "--window-position=40,40",
      "--window-size=1140,900",
    ],
  });

  browser.on("disconnected", () => {
    console.log("[RankAce] Chrome closed — shutting down RankAce background processes.");
    cleanupProcesses();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    cleanupProcesses();
    process.exit(0);
  });

  const swTarget = await browser.waitForTarget(
    (t) => t.type() === "service_worker" && t.url().includes("background.js"),
    { timeout: 15000 }
  );
  const extId = new URL(swTarget.url()).hostname;

  const pages = await browser.pages();
  const homePage = pages[0] || (await browser.newPage());
  await homePage.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});

  const dashPage = await browser.newPage();
  await dashPage.goto(
    backendUp ? "http://127.0.0.1:3000/dashboard" : "http://127.0.0.1:3000/dashboard?demo=1",
    { waitUntil: "domcontentloaded", timeout: 20000 }
  ).catch(() => {});

  const livePage = await browser.newPage();
  await livePage.goto("https://www.python.org/", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await livePage.waitForSelector("#rankace-floating-pill", { timeout: 12000 }).catch(() => {});

  // Open floating side-by-side 4-tab Studio panel synced to the live website tab
  const panelPage = await browser.newPage();
  await panelPage.goto(`chrome-extension://${extId}/sidepanel.html`, { waitUntil: "domcontentloaded" });
  await panelPage.evaluate(async (extOrigin) => {
    const [pyTab] = await chrome.tabs.query({ url: "*://www.python.org/*" });
    const [curTab] = await chrome.tabs.query({ url: `${extOrigin}/*` });
    if (curTab && curTab.id) {
      await chrome.windows.create({
        tabId: curTab.id,
        type: "popup",
        left: 1190,
        top: 40,
        width: 440,
        height: 900,
        focused: true,
      });
    }
    if (pyTab) {
      activeTabId = pyTab.id;
      fetchAuditData();
    }
  }, `chrome-extension://${extId}`);

  await livePage.bringToFront().catch(() => {});
  console.log("[RankAce] Everything is open and ready! Close Chrome anytime to stop.");
}

main().catch((err) => {
  console.error("[RankAce] Launch error:", err.message);
  cleanupProcesses();
  process.exit(1);
});
