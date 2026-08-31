// Browser QA helper, evaluated only in an isolated test session.
// It reads the visible tactical map and sends normal keyboard input.
// No localStorage writes, game-state access, teleport, immunity or progression injection.
(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const key = (code, down) =>
    window.dispatchEvent(
      new KeyboardEvent(down ? 'keydown' : 'keyup', {
        code,
        key: { KeyW: 'w', KeyE: 'e', KeyF: 'f' }[code] || code,
        bubbles: true,
      }),
    );
  const press = async (code, ms) => {
    key(code, true);
    await wait(ms);
    key(code, false);
    await wait(110);
  };
  const until = performance.now() + 22000;
  document.querySelectorAll('button').forEach((button) => {
    if (button.textContent === 'Reprendre la partie') button.click();
  });
  await wait(150);
  let steps = 0;
  while (performance.now() < until && steps < 120) {
    if (document.querySelector('[data-slot="dialog-content"]')) break;
    const output = document.querySelector('output[aria-label="Coordonnées"]');
    const polyline = document.querySelector('.tactical-map polyline');
    if (!output || !polyline) break;
    const point = polyline.getAttribute('points').split(' ')[1];
    if (!point) break;
    const [tx, ty] = point.split(',').map((x) => Number(x) / 10);
    const x = Number(output.dataset.x),
      y = Number(output.dataset.y),
      angle = Number(output.dataset.angle);
    const desired = Math.atan2(ty - y, tx - x);
    let difference = (desired - angle) % (2 * Math.PI);
    if (difference > Math.PI) difference -= 2 * Math.PI;
    if (difference < -Math.PI) difference += 2 * Math.PI;
    if (document.querySelector('.interaction-prompt')) {
      await press('KeyE', 30);
      continue;
    }
    if (Math.abs(difference) > 0.12)
      await press(
        difference > 0 ? 'ArrowRight' : 'ArrowLeft',
        Math.min(160, (Math.abs(difference) / 2.79) * 1000),
      );
    else
      await press(
        'KeyW',
        Math.min(240, (Math.hypot(tx - x, ty - y) / 2.645) * 1000),
      );
    steps++;
  }
  for (const code of ['KeyW', 'ArrowLeft', 'ArrowRight', 'Space'])
    key(code, false);
  if (!document.querySelector('[data-slot="dialog-content"]'))
    document.querySelectorAll('button').forEach((button) => {
      if (button.textContent === 'Pause') button.click();
    });
  return JSON.stringify({
    steps,
    stage: document.querySelector('.game-shell')?.dataset.stage,
    position: document.querySelector('output[aria-label="Coordonnées"]')
      ?.textContent,
    health: document.querySelector('meter[aria-label="Intégrité"]')?.value,
    dialog: document
      .querySelector('[data-slot="dialog-content"]')
      ?.innerText.slice(0, 220),
    objective: document.querySelector('.mission-heading h1')?.textContent,
  });
})();
