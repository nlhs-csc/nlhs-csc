
import { spawn } from "node:child_process";
import {
  readdirSync,
  mkdirSync,
  existsSync,
  mkdtempSync,
  rmSync,
  readFileSync
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

// ===== 基本檢查 =====

if (!existsSync(slidesDir)) {
  console.error("找不到 slides 資料夾，請在專案根目錄執行。");
  process.exit(1);
}

if (!existsSync(serverScript)) {
  console.error("找不到 http-server，請先執行 npm install。");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

// ===== 取得教材清單 =====

const files = readdirSync(slidesDir)
  .filter(file => extname(file).toLowerCase() === ".md")
  .sort((a, b) => a.localeCompare(b, "zh-Hant"));

if (files.length === 0) {
  console.error("slides 資料夾裡沒有 Markdown 檔案。");
  process.exit(1);
}

// ===== 時間戳記 =====

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

// ===== 解析選取範圍 =====
// 支援：1,3,5 / 2-4 / all
// 回傳從 0 開始的索引陣列；無效輸入回傳 null。

function parseSelection(input, total) {
  const value = input.trim().toLowerCase();

  if (!value || value === "all") {
    return Array.from({ length: total }, (_, i) => i);
  }

  const selected = new Set();

  for (const part of value.split(",")) {
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

    if (
      start < 1 ||
      end > total ||
      start > end
    ) {
      return null;
    }

    for (let n = start; n <= end; n++) {
      selected.add(n - 1);
    }
  }

  return [...selected].sort((a, b) => a - b);
}

// ===== 選擇匯出格式 =====

async function askFormat(rl) {
  const arg = process.argv[2]?.toLowerCase();

  if (arg === "pptx" || arg === "pdf") {
    return arg;
  }

  if (arg) {
    throw new Error(
      `不支援的匯出格式：${arg}，請使用 pptx 或 pdf。`
    );
  }

  console.log("\n========== 選擇匯出格式 ==========");
  console.log("[1] PowerPoint (.pptx)");
  console.log("[2] PDF (.pdf)");
  console.log("[0] 取消");

  while (true) {
    const input = (
      await rl.question("\n請選擇格式：")
    ).trim().toLowerCase();

    if (input === "1" || input === "pptx") return "pptx";
    if (input === "2" || input === "pdf") return "pdf";

    if (input === "0") return null;

    console.log("輸入無效，請輸入 1、2 或 0。");
  }
}

// ===== 選擇教材檔案 =====

async function askFiles(rl, files) {
  console.log("\n========== 可匯出的教材 ==========");

  files.forEach((file, i) => {
    console.log(`[${i + 1}] ${file}`);
  });

  console.log("\n輸入範例：1,3,5 或 2-4");
  console.log("輸入 all 或直接 Enter：全部匯出");
  console.log("輸入 0：取消匯出");

  while (true) {
    const input = (
      await rl.question("\n請選擇教材：")
    ).trim();

    if (input === "0") return [];

    const result = parseSelection(input, files.length);

    if (result && result.length > 0) {
      return result.map(i => files[i]);
    }

    console.log("輸入無效，請重新輸入。");
  }
}

// ===== 選擇投影片 =====

async function askSlides(rl, slides, filename) {
  console.log(`\n教材：${filename}`);
  console.log("可匯出的投影片：");

  slides.forEach((slide, i) => {
    console.log(`[${i + 1}] ${slide.title}`);
  });

  console.log("\n輸入範例：1,3,5 或 2-4");
  console.log("輸入 all 或直接 Enter：全部匯出");

  while (true) {
    const input = await rl.question("\n請選擇投影片：");
    const result = parseSelection(input, slides.length);

    if (result && result.length > 0) {
      return result;
    }

    console.log("輸入無效，請重新輸入。");
  }
}

// ===== 取得可用連接埠 =====

async function getFreePort() {
  const server = createServer();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const port = server.address().port;

  await new Promise((resolve, reject) => {
    server.close(error =>
      error ? reject(error) : resolve()
    );
  });

  return port;
}

// ===== 等待網站啟動 =====

async function waitForServer(url, timeout = 20000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);

      if (response.ok) return;
    } catch {
      // 網站尚未啟動
    }

    await delay(300);
  }

  throw new Error("本機網站啟動逾時。");
}

// ===== 將截圖轉成 PDF =====

async function writePdf(page, imagePaths, output) {
  const images = imagePaths.map(path => {
    const data = readFileSync(path).toString("base64");

    return `
      <section class="pdf-page">
        <img src="data:image/png;base64,${data}">
      </section>
    `;
  });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: 13.333333in 7.5in;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: #282c34;
          }

          .pdf-page {
            width: 13.333333in;
            height: 7.5in;
            overflow: hidden;
            page-break-after: always;
            break-after: page;
          }

          .pdf-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .pdf-page img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: fill;
          }
        </style>
      </head>
      <body>
        ${images.join("\n")}
      </body>
    </html>
  `);

  await page.pdf({
    path: output,
    printBackground: true,
    preferCSSPageSize: true,
    width: "13.333333in",
    height: "7.5in",
    margin: {
      top: "0",
      right: "0",
      bottom: "0",
      left: "0"
    }
  });
}

// ===== 主程式 =====

let serverProcess;
let browser;
let succeeded = 0;
let failed = 0;
let skipped = 0;

const rl = createInterface({
  input: stdin,
  output: stdout
});

try {
  // 先選格式與檔案，不必等待瀏覽器啟動
  const format = await askFormat(rl);

  if (!format) {
    console.log("已取消匯出。");
  } else {
    const selectedFiles = await askFiles(rl, files);

    if (selectedFiles.length === 0) {
      console.log("已取消匯出。");
    } else {
      console.log(`\n匯出格式：${format.toUpperCase()}`);
      console.log(`選取教材：${selectedFiles.length} 份`);

      const port = await getFreePort();
      const baseUrl = `http://127.0.0.1:${port}`;

      serverProcess = spawn(
        process.execPath,
        [
          serverScript,
          ".",
          "-p",
          String(port),
          "-c-1"
        ],
        {
          cwd: root,
          stdio: "ignore",
          windowsHide: true
        }
      );

      await waitForServer(baseUrl);
      browser = await chromium.launch({ headless: true });

      for (const file of selectedFiles) {
        let page;
        let tempDir;

        try {
          const lessonId = basename(file, extname(file));
          const timestamp = getTimestamp();
          const output = join(
            outputDir,
            `${lessonId}_${timestamp}.${format}`
          );

          console.log(`\n========== ${file} ==========`);

          page = await browser.newPage({
            viewport: { width: 1280, height: 720 },
            deviceScaleFactor: 1
          });

          await page.goto(
            `${baseUrl}/?lesson=${encodeURIComponent(lessonId)}`,
            {
              waitUntil: "domcontentloaded",
              timeout: 60000
            }
          );

          await page.waitForFunction(() => {
            return (
              window.Reveal &&
              Reveal.isReady() &&
              Reveal.getSlides().length > 0
            );
          }, { timeout: 60000 });

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
              "沒有找到投影片，請檢查 js/presentation.js。"
            );
          }

          const selected = await askSlides(rl, slides, file);

          tempDir = mkdtempSync(
            join(tmpdir(), "club-slides-")
          );

          let pptx;

          if (format === "pptx") {
            pptx = new pptxgen();
            pptx.layout = "LAYOUT_WIDE";
            pptx.author = "資研社";
            pptx.subject = "資研社教學教材";
          }

          const imagePaths = [];

          for (let i = 0; i < selected.length; i++) {
            const target = slides[selected[i]];

            await page.evaluate(({ h, v, f }) => {
              Reveal.slide(h, v, f);
            }, target);

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

            imagePaths.push(imagePath);

            if (pptx) {
              const pptSlide = pptx.addSlide();

              pptSlide.addImage({
                path: imagePath,
                x: 0,
                y: 0,
                w: 13.333333,
                h: 7.5
              });
            }

            console.log(
              `已處理 ${i + 1}/${selected.length}：${target.title}`
            );
          }

          if (format === "pptx") {
            await pptx.writeFile({ fileName: output });
          } else {
            // 使用另一個頁面列印，避免影響簡報原始頁面
            const pdfPage = await browser.newPage();

            try {
              await writePdf(pdfPage, imagePaths, output);
            } finally {
              await pdfPage.close();
            }
          }

          console.log(`完成：${output}`);
          succeeded++;
        } catch (error) {
          failed++;
          console.error(`匯出失敗：${file}`);
          console.error(error.message);
        } finally {
          if (page) await page.close();

          if (tempDir && existsSync(tempDir)) {
            rmSync(tempDir, {
              recursive: true,
              force: true
            });
          }
        }
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
  `\n匯出結束：成功 ${succeeded} 份，失敗 ${failed} 份。`
);

if (failed > 0) {
  process.exitCode = 1;
}
