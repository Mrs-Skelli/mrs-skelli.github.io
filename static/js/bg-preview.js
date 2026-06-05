(function () {
  const bgLayer = document.getElementById('bg-layer');
  const matrixLayer = document.getElementById('matrix-layer');
  const fxLayer = document.getElementById('fx-layer');
  const buttons = document.querySelectorAll('.bg-preview-picker button[data-pattern]');

  if (!bgLayer || !window.SkelliBg) return;

  const mgr = SkelliBg.createManager({ bgLayer: bgLayer, matrixLayer: matrixLayer, fxLayer: fxLayer });

  function setPattern(name) {
    mgr.setPattern(name);
    buttons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.pattern === name);
    });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setPattern(btn.dataset.pattern);
    });
  });

  const params = new URLSearchParams(window.location.search);
  const initial = params.get('pattern');
  setPattern(SkelliBg.patterns.includes(initial) ? initial : 'aurora');
})();
