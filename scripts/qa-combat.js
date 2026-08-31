// Isolated QA only: read the rendered tactical map, navigate and fire normal inputs.
// No hidden state, teleport, immunity, or save injection.
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = (code, down) =>
    window.dispatchEvent(
      new KeyboardEvent(down ? 'keydown' : 'keyup', {
        code,
        key: { KeyW: 'w', KeyF: 'f', Space: ' ' }[code] || code,
        bubbles: true,
      }),
    );
  const press = async (code, ms) => {
    key(code, true);
    await wait(ms);
    key(code, false);
    await wait(105);
  };
  const click = (label) =>
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent === label)
      ?.click();
  click('Reprendre la partie');
  await wait(180);
  const until = performance.now() + 23000;
  let shots = 0;
  while (
    performance.now() < until &&
    !document.querySelector('[role="dialog"]')
  ) {
    if (
      document.querySelector('.save-message')?.textContent.includes('transfère')
    )
      break;
    const out = document.querySelector('output[aria-label="Coordonnées"]');
    if (!out) break;
    const x = +out.dataset.x,
      y = +out.dataset.y,
      angle = +out.dataset.angle;
    const reds = [
      ...document.querySelectorAll('.tactical-map circle[fill="#ff6577"]'),
    ]
      .map((c) => ({
        x: +c.getAttribute('cx') / 10,
        y: +c.getAttribute('cy') / 10,
      }))
      .sort(
        (a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y),
      );
    const target = reds[0];
    if (!target) break;
    const walls = new Set(
      [...document.querySelectorAll('.tactical-map rect')].map(
        (r) => +r.getAttribute('x') / 10 + ',' + +r.getAttribute('y') / 10,
      ),
    );
    const start = Math.floor(x) + ',' + Math.floor(y),
      end = Math.floor(target.x) + ',' + Math.floor(target.y);
    const queue = [start],
      previous = new Map([[start, null]]);
    for (let i = 0; i < queue.length && !previous.has(end); i++) {
      const [px, py] = queue[i].split(',').map(Number);
      for (const [nx, ny] of [
        [px + 1, py],
        [px - 1, py],
        [px, py + 1],
        [px, py - 1],
      ]) {
        const k = nx + ',' + ny;
        if (
          nx < 0 ||
          ny < 0 ||
          nx > 15 ||
          ny > 15 ||
          walls.has(k) ||
          previous.has(k)
        )
          continue;
        previous.set(k, queue[i]);
        queue.push(k);
      }
    }
    const path = [];
    let k = end;
    while (k && k !== start && previous.has(k)) {
      path.unshift(k.split(',').map((n) => +n + 0.5));
      k = previous.get(k);
    }
    const clear = Array.from({ length: 30 }, (_, i) => {
      const t = i / 30;
      return !walls.has(
        Math.floor(x + (target.x - x) * t) +
          ',' +
          Math.floor(y + (target.y - y) * t),
      );
    }).every(Boolean);
    const inRange = clear && Math.hypot(target.x - x, target.y - y) < 5;
    const point = inRange ? [target.x, target.y] : path[0];
    if (!point) break;
    let d = (Math.atan2(point[1] - y, point[0] - x) - angle) % (2 * Math.PI);
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    if (Math.abs(d) > 0.065)
      await press(
        d > 0 ? 'ArrowRight' : 'ArrowLeft',
        Math.min(160, (Math.abs(d) / 2.79) * 1000),
      );
    else if (inRange) {
      await press('Space', 420);
      shots++;
      if (
        Math.hypot(target.x - x, target.y - y) < 4 &&
        +(document.querySelector('meter[aria-label="Charge"]')?.value ?? 0) > 30
      )
        await press('KeyF', 30);
    } else
      await press(
        'KeyW',
        Math.min(220, (Math.hypot(point[0] - x, point[1] - y) / 2.645) * 1000),
      );
  }
  for (const code of ['Space', 'KeyW', 'ArrowLeft', 'ArrowRight'])
    key(code, false);
  if (!document.querySelector('[role="dialog"]')) click('Pause');
  return JSON.stringify({
    bursts: shots,
    stage: document.querySelector('.game-shell')?.dataset.stage,
    health: document.querySelector('meter[aria-label="Intégrité"]')?.value,
    position: document.querySelector('output[aria-label="Coordonnées"]')
      ?.textContent,
    target: document.querySelector('.target-readout')?.textContent,
    message: document.querySelector('.save-message')?.textContent,
    dialog: document.querySelector('[role="dialog"]')?.innerText.slice(0, 220),
  });
})();
