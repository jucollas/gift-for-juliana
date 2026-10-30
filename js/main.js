(() => {
  const { title, photos, finalMessage } = window.GIFT;
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("tree");
  const $ = (id) => document.getElementById(id);

  $("title").textContent = title;
  document.title = title;

  // Aleatorio con semilla: el árbol siempre se ve igual
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const mk = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  };

  // ---- Suelo, tronco y ramas
  mk("ellipse", { cx: 400, cy: 800, rx: 300, ry: 22, fill: "#1d1030", opacity: 0.8 });
  const wood = mk("g", { fill: "none", stroke: "#3b2433", "stroke-linecap": "round" });
  [
    ["M400 800 C392 720 412 640 400 540 C396 480 386 440 380 390", 24],
    ["M398 540 C375 490 330 460 262 410", 11],
    ["M400 500 C432 450 482 425 548 380", 11],
    ["M388 440 C376 390 356 335 336 270", 9],
    ["M396 450 C420 390 440 330 472 250", 9],
    ["M384 410 C350 385 300 345 246 300", 7],
    ["M398 430 C440 400 490 350 560 300", 7]
  ].forEach(([d, w]) => mk("path", { d, "stroke-width": w }, wood));

  // ---- Hojas (fondo de la copa)
  const CX = 400, CY = 285;
  const inEllipse = (x, y, rx, ry) => ((x - CX) / rx) ** 2 + ((y - CY) / ry) ** 2 <= 1;
  const greens = ["#4f6f5a", "#6b8f71", "#86a885", "#c98aa6"];
  const leaves = mk("g", {});
  for (let i = 0; i < 170; i++) {
    const x = CX + (rnd() * 2 - 1) * 300, y = CY + (rnd() * 2 - 1) * 230;
    if (!inEllipse(x, y, 295, 225)) continue;
    mk("ellipse", {
      cx: x, cy: y, rx: 12 + rnd() * 16, ry: 6 + rnd() * 8,
      transform: `rotate(${rnd() * 180} ${x} ${y})`,
      fill: greens[(rnd() * greens.length) | 0], opacity: 0.45 + rnd() * 0.4
    }, leaves);
  }

  // ---- Posiciones de flores (sin que se amontonen)
  const pts = [];
  let tries = 0, minD = 74;
  while (pts.length < photos.length && tries++ < 6000) {
    if (tries % 800 === 0) minD -= 6;
    const x = CX + (rnd() * 2 - 1) * 260, y = CY + (rnd() * 2 - 1) * 195;
    if (!inEllipse(x, y, 255, 190)) continue;
    if (pts.every(p => Math.hypot(p.x - x, p.y - y) > minD)) pts.push({ x, y });
  }

  // ---- Flores
  const palette = [["#ffd6e0", "#f4a3bd"], ["#ffe7c7", "#f6b98b"], ["#f3d9ff", "#c99ae6"], ["#fff3b8", "#f2cf5f"]];
  const flowers = mk("g", {});
  const seen = new Set();
  let current = 0;

  photos.forEach((ph, i) => {
    const { x, y } = pts[i] || { x: CX, y: CY };
    const [light, deep] = palette[i % palette.length];
    const bloom = mk("g", { transform: `translate(${x} ${y})` }, flowers);
    const f = mk("g", {
      class: "flower", tabindex: 0, role: "button",
      "aria-label": `Abrir recuerdo ${i + 1}: ${ph.caption}`
    }, bloom);
    f.style.setProperty("--d", `${0.6 + i * 0.18}s`);
    f.style.setProperty("--s", `${(rnd() * 2 + 4).toFixed(1)}s`);
    for (let k = 0; k < 6; k++)
      mk("ellipse", { cx: 0, cy: -13, rx: 8.5, ry: 15, fill: light, stroke: deep, "stroke-width": 1,
        transform: `rotate(${k * 60})` }, f);
    mk("circle", { r: 6.5, fill: "#f2b84b", class: "heart" }, f);
    mk("circle", { r: 26, fill: "transparent" }, f); // zona de toque más grande
    f.addEventListener("click", () => open(i));
    f.addEventListener("keydown", e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open(i)));
    f.dataset.i = i;
  });

  // ---- Modal
  const modal = $("modal"), img = $("photo"), cap = $("caption");
  function show(i) {
    current = (i + photos.length) % photos.length;
    img.src = photos[current].src;
    img.alt = photos[current].caption;
    cap.textContent = photos[current].caption;
    img.style.setProperty("--tilt", (current % 2 ? 1.2 : -1.2) + "deg");
    seen.add(current);
    svg.querySelector(`.flower[data-i="${current}"]`).classList.add("seen");
    progress();
  }
  function open(i) { show(i); if (!modal.open) modal.showModal(); }
  function progress() {
    $("progress").textContent = `${seen.size} de ${photos.length} recuerdos`;
    $("hint").style.opacity = 0;
    if (seen.size === photos.length) { $("final").textContent = finalMessage; $("final").hidden = false; }
  }
  modal.querySelector(".close").onclick = () => modal.close();
  modal.querySelector(".prev").onclick = () => show(current - 1);
  modal.querySelector(".next").onclick = () => show(current + 1);
  modal.addEventListener("click", e => e.target === modal && modal.close());
  addEventListener("keydown", e => {
    if (!modal.open) return;
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });

  // ---- Pétalos cayendo
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const box = $("petals");
    for (let i = 0; i < 16; i++) {
      const p = document.createElement("i");
      p.style.cssText = `left:${rnd() * 100}%;--t:${9 + rnd() * 9}s;--w:${rnd() * 8}s;--x:${(rnd() * 120 - 60) | 0}px;--z:${(0.6 + rnd() * 0.8).toFixed(2)}`;
      box.appendChild(p);
    }
  }
})();
