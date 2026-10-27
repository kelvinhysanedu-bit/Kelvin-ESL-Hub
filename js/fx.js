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

let idle;
function onScroll() {
  const body = document.body;
  body.classList.toggle("scrolled", window.scrollY > 6);
  body.classList.add("is-scrolling");
  clearTimeout(idle);
  idle = setTimeout(() => body.classList.remove("is-scrolling"), 180);
}
window.addEventListener("scroll", onScroll, { passive: true });
document.body.classList.toggle("scrolled", window.scrollY > 6);
