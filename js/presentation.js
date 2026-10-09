
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
        LESSON ${String(index + 1).padStart(2, "0")}
      </div>
      <h2>${lesson.title}</h2>
      <p>${lesson.description}</p>
    </a>
  `).join("");

  homePage.innerHTML = `
    <header class="home-header">
      <h1>資研社｜教學教材</h1>
      <p>
        從基礎開始，一起探索程式設計的世界。<br>
        選擇一堂課，開始學習吧！
      </p>
    </header>

    <section class="course-grid">
      ${cards}
    </section>

    <footer class="home-footer">
      Small steps, big changes.
    </footer>
  `;
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
    plugins: [RevealMarkdown, RevealHighlight]
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