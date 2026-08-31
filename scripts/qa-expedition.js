// Isolated browser QA: public SVG/HUD only; normal key/button inputs, no game-state mutation.
// Stops at mission decisions, death, unknown dialogues or hub. Assistance is the player's enabled option.
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = (code, down) =>
    window.dispatchEvent(
      new KeyboardEvent(down ? 'keydown' : 'keyup', {
        code,
        key: { KeyW: 'w', KeyE: 'e' }[code] ?? code,
        bubbles: true,
      }),
    );
  const press = async (code, ms) => {
    key(code, true);
    await wait(ms);
    key(code, false);
    await wait(75);
  };
  const button = (label) =>
    [...document.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === label && !b.disabled,
    );
  button('Reprendre la partie')?.click();
  await wait(140);
  const log = [];
  const until = performance.now() + 22000;
  while (performance.now() < until) {
    const dialog = document.querySelector('[data-slot="dialog-content"]');
    if (dialog) {
      const assisted = button('Suggérer un chemin');
      const inject = button('Injecter la commande');
      const confirm = button('Confirmer l’échange');
      if (assisted) {
        assisted.click();
        await wait(100);
        continue;
      }
      if (inject) {
        log.push('intrusion complétée');
        inject.click();
        await wait(150);
        continue;
      }
      if (confirm) {
        log.push(dialog.querySelector('section h2')?.textContent ?? 'dialogue');
        confirm.click();
        await wait(150);
        continue;
      }
      break;
    }
    const out = document.querySelector('output[aria-label="Coordonnées"]');
    if (!out) break;
    const points = document
      .querySelector('.tactical-map polyline')
      ?.getAttribute('points')
      ?.trim()
      .split(' ')
      .map((p) => p.split(',').map((n) => Number(n) / 10));
    if (!points?.length) break;
    const x = Number(out.dataset.x),
      y = Number(out.dataset.y),
      angle = Number(out.dataset.angle);
    const end = points[points.length - 1];
    const point = points[1] ?? end;
    let d = (Math.atan2(point[1] - y, point[0] - x) - angle) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    if (
      document.querySelector('.interaction-prompt') &&
      Math.hypot(end[0] - x, end[1] - y) < 1.75
    ) {
      await press('KeyE', 30);
      continue;
    }
    if (Math.abs(d) > 0.11)
      await press(
        d > 0 ? 'ArrowRight' : 'ArrowLeft',
        Math.min(150, (Math.abs(d) / 2.79) * 1000),
      );
    else
      await press(
        'KeyW',
        Math.min(250, (Math.hypot(point[0] - x, point[1] - y) / 2.5) * 1000),
      );
  }
  for (const code of ['KeyW', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE'])
    key(code, false);
  if (!document.querySelector('[data-slot="dialog-content"]'))
    button('Pause')?.click();
  return {
    log,
    stage: document.querySelector('.game-shell')?.dataset.stage,
    position: document.querySelector('output[aria-label="Coordonnées"]')
      ?.textContent,
    health: document.querySelector('meter[aria-label="Intégrité"]')?.value,
    heading: document.querySelector('.mission-heading h1')?.textContent,
    dialog: document
      .querySelector('[data-slot="dialog-content"]')
      ?.innerText.slice(0, 900),
  };
})();
