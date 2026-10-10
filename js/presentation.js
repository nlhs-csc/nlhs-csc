import RevealMath from "../node_modules/reveal.js/plugin/math/math.esm.js";

const lessons = [
  {
    id: "temp",
    title: "預覽",
    description: "這是一個預覽頁面，並非正式課程"
  },
  {
    id: "data_type",
    title: "資料型別",
    description: "認識資料如何儲存，以及 C++ 的基本資料型別"
  },
  {
    id: "variables_and_functions",
    title: "變數與函數",
    description: "學習變數、記憶體、函數與基本語法"
  },
  {
    id: "conditions",
    title: "條件判斷",
    description: "使用 if、else 等語法，讓程式依條件執行"
  },
  {
    id: "functions_and_loops",
    title: "函式與迴圈",
    description: "認識 for、while、學會重複執行程式"
  }
];

const params = new URLSearchParams(window.location.search);
const requested = params.get("lesson");

const homePage = document.querySelector("#home-page");
const revealElement = document.querySelector(".reveal");
const slideContainer = document.querySelector("#lesson-slides");

function renderHome() {
  document.title = "資研社教材｜課程首頁";
  revealElement.style.display = "none";
  homePage.style.display = "block";

  const cards = lessons.map((lesson, index) => `
    <a class="course-card"
       href="?lesson=${encodeURIComponent(lesson.id)}">
      <div class="course-number">
        LESSON ${String(index).padStart(2, "0")}
      </div>
      <h2>${lesson.title}</h2>
      <p>${lesson.description}</p>
    </a>
  `).join("");

  homePage.innerHTML = `
    <header class="home-header">
      <h1>資研社｜教學教材</h1>
      <p>
        從基礎開始，一起探索程式設計的世界<br>
        從基礎的語法到進階的演算法<br>
        讓我們一起學習然後一起打比賽吧 :D
      </p>
    </header>

    <section class="course-grid">
      ${cards}
    </section>

    <footer class="home-footer">
      內高資研、科技無限<br>
      NLCS、CPDP
    </footer>
  `;
}


function processCustomImages() {
  const links = document.querySelectorAll(
    ".reveal .slides section a"
  );

  links.forEach((link) => {
    if (link.textContent.trim() !== "!image") return;

    // 避免同一個圖片連結重複處理
    if (!link.isConnected) return;

    // 取得圖片連結後方的參數
    let width = "";
    let position = "右";
    let caption = "";

    const next = link.nextSibling;

    if (next && next.nodeType === Node.TEXT_NODE) {
      const text = next.textContent;

      const match = text.match(
        /^\s*\{\s*([^,}]*)\s*,\s*([^,}]*)\s*,\s*([^}]*)\s*\}/
      );

      if (match) {
        width = match[1].trim();
        position = match[2].trim() || "右";
        caption = match[3].trim();

        // 移除已解析的參數
        next.textContent = text.slice(match[0].length);

        if (!next.textContent.trim()) {
          next.remove();
        }
      }
    }

    // 建立圖片區塊
    const figure = document.createElement("figure");
    figure.className = "md-image-wrap";

    const positions = {
      "左": "pos-left",
      "中": "pos-center",
      "右": "pos-right"
    };

    figure.classList.add(
      positions[position] || "pos-center"
    );

    const img = document.createElement("img");
    img.src = link.href;
    img.alt = caption;

    // 有指定寬度才設定，否則使用圖片原始尺寸
    if (/^\d+(\.\d+)?$/.test(width)) {
      img.style.width = `${width}px`;
    }

    figure.appendChild(img);

    // 圖片備註
    if (caption) {
      const figcaption = document.createElement("figcaption");
      figcaption.className = "md-image-caption";
      figcaption.textContent = caption;
      figure.appendChild(figcaption);
    }

    // 替換圖片語法
    link.replaceWith(figure);

    // 清除可能殘留的參數文字
    const remaining = figure.nextSibling;

    if (
      remaining &&
      remaining.nodeType === Node.TEXT_NODE &&
      !remaining.textContent.trim()
    ) {
      remaining.remove();
    }
  });
}

function renderLesson(lesson) {
  document.title = `${lesson.title}｜資研社教材`;

  homePage.style.display = "none";
  revealElement.style.display = "block";

  slideContainer.setAttribute(
    "data-markdown",
    `slides/${lesson.id}.md`
  );

  slideContainer.setAttribute(
    "data-separator",
    "^\\r?\\n---\\r?\\n$"
  );

  slideContainer.setAttribute(
    "data-separator-vertical",
    "^\\r?\\n--\\r?\\n$"
  );

  Reveal.initialize({
    width: 1280,
    height: 720,
    margin: 0.06,
    minScale: 0.2,
    maxScale: 2,
    hash: true,
    controls: true,
    controlsLayout: "bottom-right",
    progress: true,
    slideNumber: "c/t",
    transition: "fade",
    mathjax3: {
    mathjax:
      "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js",
      tex: {
        inlineMath: [
          ["$", "$"],
          ["\\(", "\\)"]
        ]
      },
      options: {
        skipHtmlTags: [
          "script",
          "noscript",
          "style",
          "textarea",
          "pre",
          "code"
      ]
      }
    },
    plugins: [RevealMarkdown, RevealHighlight, RevealMath.MathJax3]
  }).then(() => {
    processCustomImages();

    Reveal.on("ready", processCustomImages);
    Reveal.on("slidechanged", processCustomImages);
  });
}

const selectedLesson = lessons.find(
  lesson => lesson.id === requested
);

if (!requested || requested === "home" || !selectedLesson) {
  renderHome();
} else {
  renderLesson(selectedLesson);
}