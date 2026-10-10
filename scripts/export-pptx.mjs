
import { spawn } from "node:child_process";
import {
  readdirSync,
  mkdirSync,
  existsSync,
  mkdtempSync,
  rmSync
} from "node:fs";
import {
  resolve,
  basename,
  extname,
  join
} from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { chromium } from "playwright";
import pptxgen from "pptxgenjs";

const root = process.cwd();
const slidesDir = resolve(root, "slides");
const outputDir = resolve(root, "exports");
const serverScript = resolve(
  root,
  "node_modules/http-server/bin/http-server"
);

if (!existsSync(slidesDir)) {
  console.error("找不到 slides 資料夾，請在專案根目錄執行。");
  process.exit(1);
}

if (!existsSync(serverScript)) {
  console.error("找不到 http-server，請先執行 npm install。");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const files = readdirSync(slidesDir)
  .filter(file => extname(file).toLowerCase() === ".md")
  .sort((a, b) => a.localeCompare(b, "zh-Hant"));

if (files.length === 0) {
  console.error("slides 資料夾裡沒有 Markdown 檔案。");
  process.exit(1);
}

// 產生 _MMdd_hhmm 格式的時間戳記
function getTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");

  return (
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "_" +
    pad(d.getHours()) +
    pad(d.getMinutes())
  );
}

// 取得可用的本機連接埠
async function getFreePort() {
  const server = createServer();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const port = server.address().port;

  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });

  return port;
}

// 等待本機網站啟動
async function waitForServer(url, timeout = 20000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);

      if (response.ok) return;
    } catch {
      // 伺服器尚未啟動，稍後再試
    }

    await delay(300);
  }

  throw new Error("本機網站啟動逾時。");
}

// 將 1,3-5 轉成 [0, 2, 3, 4]
function parseSelection(input, total) {
  if (!input.trim() || input.trim().toLowerCase() === "all") {
    return Array.from({ length: total }, (_, i) => i);
  }

  const selected = new Set();

  for (const part of input.split(",")) {
    const item = part.trim();

    if (/^\d+$/.test(item)) {
      const n = Number(item);

      if (n < 1 || n > total) return null;

      selected.add(n - 1);
      continue;
    }

    const match = item.match(/^(\d+)\s*-\s*(\d+)$/);

    if (!match) return null;

    const start = Number(match[1]);
    const end = Number(match[2]);

    if (start < 1 || end > total || start > end) {
      return null;
    }

    for (let n = start; n <= end; n++) {
      selected.add(n - 1);
    }
  }

  return [...selected].sort((a, b) => a - b);
}

// 詢問要匯出的投影片
async function askSelection(rl, slides, filename) {
  console.log(`\n教材：${filename}`);
  console.log("可匯出的投影片：");

  slides.forEach((slide, i) => {
    console.log(`${i + 1}. ${slide.title}`);
  });

  while (true) {
    const input = await rl.question(
      "\n輸入頁碼（例如 1,3-5），直接 Enter 匯出全部："
    );

    const result = parseSelection(input, slides.length);

    if (result && result.length > 0) {
      return result;
    }

    console.log("輸入無效，請重新輸入。");
  }
}

let serverProcess;
let browser;
let failed = 0;
const rl = createInterface({ input: stdin, output: stdout });

try {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  // 啟動靜態網站，讓 Markdown 與 CSS 能正常載入
  serverProcess = spawn(
    process.execPath,
    [serverScript, ".", "-p", String(port), "-c-1"],
    {
      cwd: root,
      stdio: "ignore",
      windowsHide: true
    }
  );

  await waitForServer(baseUrl);

  browser = await chromium.launch({ headless: true });

  for (const file of files) {
    const lessonId = basename(file, extname(file));
    const output = join(
      outputDir,
      `${lessonId}_${getTimestamp()}.pptx`
    );

    let tempDir;

    try {
      console.log(`\n正在處理：${file}`);

      const page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1
      });

      // presentation.js 會依照 lesson 參數載入教材
      await page.goto(
        `${baseUrl}/?lesson=${encodeURIComponent(lessonId)}`,
        { waitUntil: "domcontentloaded", timeout: 60000 }
      );

      // 等待 Reveal.js 與 Markdown 載入完成
      await page.waitForFunction(() => {
        return (
          window.Reveal &&
          Reveal.isReady() &&
          Reveal.getSlides().length > 0
        );
      }, { timeout: 60000 });

      // 隱藏簡報控制鈕與進度條，避免截進 PPTX
      await page.addStyleTag({
        content: `
          .reveal .controls,
          .reveal .progress {
            display: none !important;
          }
        `
      });

      const slides = await page.evaluate(() => {
        return Reveal.getSlides().map((section, index) => {
          const indices = Reveal.getIndices(section);

          return {
            index,
            h: indices.h,
            v: indices.v,
            f: indices.f,
            title: (
              section.querySelector("h1,h2,h3,h4")?.innerText ||
              `第 ${index + 1} 張投影片`
            ).trim()
          };
        });
      });

      if (slides.length === 0) {
        throw new Error(
          "沒有找到投影片，請檢查教材是否已登記在 js/presentation.js。"
        );
      }

      const selected = await askSelection(rl, slides, file);

      tempDir = mkdtempSync(join(tmpdir(), "club-slides-"));

      const pptx = new pptxgen();
      pptx.layout = "LAYOUT_WIDE";
      pptx.author = "資研社";
      pptx.subject = "資研社教學教材";

      for (let i = 0; i < selected.length; i++) {
        const slideIndex = selected[i];
        const target = slides[slideIndex];

        // 切換至指定投影片
        await page.evaluate(({ h, v, f }) => {
          Reveal.slide(h, v, f);
        }, target);

        // 等待轉場動畫完成
        await delay(400);

        const imagePath = join(
          tempDir,
          `slide-${String(i + 1).padStart(3, "0")}.png`
        );

        await page.screenshot({
          path: imagePath,
          type: "png",
          animations: "disabled"
        });

        // 將整張投影片的畫面放進 PowerPoint
        const pptSlide = pptx.addSlide();

        pptSlide.addImage({
          path: imagePath,
          x: 0,
          y: 0,
          w: 13.333333,
          h: 7.5
        });

        console.log(
          `已匯出 ${i + 1}/${selected.length}：${target.title}`
        );
      }

      await pptx.writeFile({ fileName: output });

      console.log(`完成：${output}`);

      await page.close();
    } catch (error) {
      failed++;
      console.error(`匯出失敗：${file}`);
      console.error(error.message);
    } finally {
      if (tempDir && existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }
} catch (error) {
  failed++;
  console.error(`匯出程式發生錯誤：${error.message}`);
} finally {
  rl.close();

  if (browser) {
    await browser.close();
  }

  if (serverProcess) {
    serverProcess.kill();
  }
}

console.log(
  `\n匯出結束：成功 ${files.length - failed} 份，失敗 ${failed} 份。`
);

if (failed > 0) {
  process.exitCode = 1;
}
