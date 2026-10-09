
const allowedLessons = [
    "函式與迴圈",
    "陣列與物件",
    "temp"
];

const params = new URLSearchParams(window.location.search);
const requested = params.get("lesson") || allowedLessons[0];
const lesson = allowedLessons.includes(requested)
  ? requested
  : allowedLessons[0];

document.title = `${lesson}｜資研社教材`;

const slideContainer = document.querySelector("#lesson-slides");
slideContainer.setAttribute("data-markdown", `slides/${lesson}.md`);
slideContainer.setAttribute("data-separator", "^\\r?\\n---\\r?\\n$");
slideContainer.setAttribute("data-separator-vertical", "^\\r?\\n--\\r?\\n$");

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