// Small dependency-free confetti burst, styled to match the warm palette.
// Spawns a handful of absolutely-positioned pieces at the given origin and
// lets a CSS animation carry them outward before removing them from the DOM.

const COLORS = ["#9c4a63", "#ba7517", "#b54b3a", "#c1673e", "#aba396"];

export function burstConfetti(origin: HTMLElement) {
  if (typeof window === "undefined") return;
  const rect = origin.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  const pieceCount = 16;
  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    const angle = (Math.PI * 2 * i) / pieceCount + Math.random() * 0.5;
    const distance = 40 + Math.random() * 50;
    const xEnd = Math.cos(angle) * distance;
    const yEnd = Math.sin(angle) * distance - 20;
    const rotate = 180 + Math.random() * 360;
    const color = COLORS[i % COLORS.length];
    const isRound = i % 2 === 0;

    piece.style.left = `${originX}px`;
    piece.style.top = `${originY}px`;
    piece.style.background = color;
    piece.style.borderRadius = isRound ? "50%" : "1px";
    piece.style.setProperty("--confetti-x-end", `${xEnd}px`);
    piece.style.setProperty("--confetti-y-end", `${yEnd}px`);
    piece.style.setProperty("--confetti-rotate", `${rotate}deg`);

    document.body.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove());
    // Safety cleanup in case animationend doesn't fire.
    setTimeout(() => piece.remove(), 1000);
  }
}
