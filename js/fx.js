/* Small visual effects shared by the student and teacher pages: a ripple where a button is pressed,
   and two classes on <body> that the stylesheet uses for the frosted top bar. */

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const RIPPLE_ON = ".btn, .wtab, .chip-btn, .toggle button";

if (!reduce) {
  document.addEventListener(
    "pointerdown",
    (e) => {
      const b = e.target.closest(RIPPLE_ON);
      if (!b || b.disabled) return;
      const r = b.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.4;
      const dot = document.createElement("span");
      dot.className = "fx-ripple";
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      b.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove());
      setTimeout(() => dot.remove(), 900);
    },
    { passive: true }
  );
}

/* The top bar gets smaller once the page is scrolled. It would also pull the page up by the height it loses, so the
   difference is measured here and given back as bottom margin (--tb-delta), which keeps everything below it still. */
export function measureTopbar() {
  const bar = document.querySelector(".topbar");
  const body = document.body;
  if (!bar || body.classList.contains("quiz-mode")) return;
  const was = body.classList.contains("scrolled");
  body.classList.add("no-tr");
  body.classList.remove("scrolled");
  const full = bar.offsetHeight;
  body.classList.add("scrolled");
  const small = bar.offsetHeight;
  body.classList.toggle("scrolled", was);
  void bar.offsetHeight;
  body.classList.remove("no-tr");
  document.documentElement.style.setProperty("--tb-delta", Math.max(0, full - small) + "px");
}

let idle;
let measured = false;
function onScroll() {
  const body = document.body;
  const y = window.scrollY;
  if (!measured) {
    measured = true;
    measureTopbar();
  }
  /* Two thresholds, so the bar does not flutter between the two sizes near the top. */
  if (y > 12) body.classList.add("scrolled");
  else if (y < 4) body.classList.remove("scrolled");
  body.classList.add("is-scrolling");
  clearTimeout(idle);
  idle = setTimeout(() => body.classList.remove("is-scrolling"), 180);
}
window.addEventListener("scroll", onScroll, { passive: true });
document.body.classList.toggle("scrolled", window.scrollY > 12);

let resizing;
window.addEventListener("resize", () => {
  clearTimeout(resizing);
  resizing = setTimeout(measureTopbar, 200);
});
document.fonts?.ready.then(measureTopbar);
