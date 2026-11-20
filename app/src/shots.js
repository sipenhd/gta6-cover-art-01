// Fixed scenes for screenshots: ?shot=editor shows the page with sample
// photos loaded; ?shot=cover shows the exported cover alone, at the post
// size the query names. `photo` / `photo2` pick the samples
// (samples/<photo>.jpg), `layout` / `size` / `grade` / `caption` /
// `tagline` set the poster. window.__shotReady is set once painted.
export async function runShot(shot, query, hooks) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photoA = await hooks.loadSample(query.get('photo') ?? 'pier');
  const photoB = await hooks.loadSample(query.get('photo2') ?? 'boulevard');
  const layout = query.get('layout') ?? 'strip';
  const panelsFor = (n) => {
    const base = [
      { photo: 0, zoom: 1.15, panX: 0, panY: 0 },
      { photo: 1, zoom: 1.25, panX: 0, panY: 0 },
      { photo: 0, zoom: 1.45, panX: 0.2, panY: 0 },
      { photo: 1, zoom: 1.35, panX: -0.2, panY: 0 },
    ];
    return base.slice(0, n);
  };
  const panelCount = layout === 'strip' || layout === 'quad' ? 4 : 3;
  hooks.apply({
    photos: [photoA, photoB, photoA],
    layout,
    size: query.get('size') ?? '1080x1080',
    grade: query.get('grade') ?? 'sunset',
    halftone: query.get('halftone') !== '0',
    caption: query.get('caption') ?? 'Sunset City Called',
    tagline: query.get('tagline') ?? 'It wants its neon back',
    panels: panelsFor(panelCount),
  });
  hooks.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
