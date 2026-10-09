
import { spawnSync } from "node:child_process";
import { readdirSync, mkdirSync, existsSync } from "node:fs";
import { resolve, basename, extname, join } from "node:path";

const root = process.cwd();
const slidesDir = resolve(root, "slides");
const outputDir = resolve(root, "exports");

if (!existsSync(slidesDir)) {
  console.error("找不到 slides 資料夾，請在專案根目錄執行。");
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

let failed = 0;

for (const file of files) {
  const input = join(slidesDir, file);
  const output = join(
    outputDir,
    `${basename(file, extname(file))}.pptx`
  );

  console.log(`\n正在匯出：${file}`);

  const result = spawnSync(
    "pandoc",
    [
      input,
      "-o",
      output,
      "--slide-level=2"
    ],
    {
      stdio: "inherit",
      shell: process.platform === "win32"
    }
  );

  if (result.error || result.status !== 0) {
    failed++;
    console.error(`匯出失敗：${file}`);
  } else {
    console.log(`完成：${output}`);
  }
}

console.log(`\n匯出結束：成功 ${files.length - failed} 份，失敗 ${failed} 份。`);

if (failed > 0) {
  process.exitCode = 1;
}