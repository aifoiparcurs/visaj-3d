import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const FPS = 30;
const DURATION = 13.5;
const WIDTH = 1920;
const HEIGHT = 1080;
const FRAME_COUNT = Math.round(DURATION * FPS);
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = "http://localhost:5173/capture-logo.html?capture=1";
const FRAMES_DIR = path.join(process.env.TEMP || ".", "visaj-logo-frames");
const OUT_FILE = "C:\\Users\\ProdeumAseris\\Desktop\\Others\\visaj-logo.mp4";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", windowsHide: true });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  protocolTimeout: 300_000,
  args: [
    `--window-size=${WIDTH},${HEIGHT}`,
    "--hide-scrollbars",
    "--ignore-gpu-blocklist",
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.waitForFunction(() => window.__visajCapture?.ready === true, {
    timeout: 30_000,
  });

  await rm(FRAMES_DIR, { recursive: true, force: true });
  await mkdir(FRAMES_DIR, { recursive: true });

  console.log(`Capturing ${FRAME_COUNT} frames at ${FPS} fps...`);
  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const t = i / FPS;
    await page.evaluate((seconds) => window.__visajCapture.setTime(seconds), t);
    const buffer = await page.screenshot({ type: "jpeg", quality: 95 });
    const name = `frame_${String(i + 1).padStart(4, "0")}.jpg`;
    await writeFile(path.join(FRAMES_DIR, name), buffer);
    if ((i + 1) % 30 === 0 || i + 1 === FRAME_COUNT) {
      console.log(`  ${i + 1}/${FRAME_COUNT}`);
    }
  }
} finally {
  await browser.close();
}

console.log("Encoding MP4...");
await run("ffmpeg", [
  "-y",
  "-framerate",
  String(FPS),
  "-i",
  path.join(FRAMES_DIR, "frame_%04d.jpg"),
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-crf",
  "17",
  "-movflags",
  "+faststart",
  OUT_FILE,
]);

console.log(`Saved ${OUT_FILE}`);
