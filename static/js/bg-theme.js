(function (global) {
  const THEME_KEY = 'skelli-bg-theme';
  const DEFAULT = 'none';

  const patterns = [
    'none', 'hex', 'circuit', 'dots', 'topo', 'crowskull',
    'aurora', 'datastream', 'pulse-hex', 'matrix',
    'circuit-pulse', 'hex-scan', 'dot-twinkle', 'topo-drift',
    'phosphor', 'scan-sweep', 'cursor-field', 'boot-log',
    'packet-sniff', 'port-scan', 'hash-rain', 'glitch',
    'deep-ocean', 'starfield', 'breathe'
  ];

  const jsPatterns = new Set([
    'matrix', 'cursor-field', 'boot-log', 'packet-sniff', 'port-scan', 'hash-rain'
  ]);

  const managerCache = new WeakMap();

  const bootThemes = [
    { id: 'matrix', label: 'Matrix Rain', desc: 'Digital cascade' },
    { id: 'none', label: 'Classic', desc: 'Pure terminal black' },
    { id: 'port-scan', label: 'Port Scan', desc: 'Security recon mode' },
    { id: 'breathe', label: 'Box Breathe', desc: '4-4-4-4 calm pulse' }
  ];

  function createManager(refs) {
    if (refs.bgLayer && managerCache.has(refs.bgLayer)) {
      return managerCache.get(refs.bgLayer);
    }

    const bgLayer = refs.bgLayer;
    const matrixLayer = refs.matrixLayer;
    const fxLayer = refs.fxLayer;
    let matrixReady = false;
    let fxTimers = [];

    function clearFx() {
      fxTimers.forEach(function (t) {
        clearInterval(t);
        clearTimeout(t);
      });
      fxTimers = [];
      if (fxLayer) {
        fxLayer.innerHTML = '';
        fxLayer.className = 'fx-layer';
      }
    }

    function trackTimer(id) {
      fxTimers.push(id);
      return id;
    }

    function buildMatrix() {
      if (!matrixLayer) return;
      if (matrixLayer.children.length > 0) {
        matrixReady = true;
        return;
      }
      if (matrixReady) return;
      matrixReady = true;

      const chars = '01ｱｲｳｴｵｶｷｸｹｺABCDEF$%';
      const columns = Math.ceil(window.innerWidth / 18);

      for (let i = 0; i < columns; i++) {
        const col = document.createElement('div');
        col.className = 'matrix-column';
        col.style.left = (i * 18) + 'px';
        col.style.animationDuration = (4 + Math.random() * 6) + 's';
        col.style.animationDelay = (-Math.random() * 8) + 's';

        let text = '';
        const len = 20 + Math.floor(Math.random() * 18);
        for (let j = 0; j < len; j++) {
          text += chars[Math.floor(Math.random() * chars.length)] + '\n';
        }
        col.textContent = text;
        matrixLayer.appendChild(col);
      }
    }

    function buildCursorField() {
      const cursors = ['_', '█', '▌', '│'];
      for (let i = 0; i < 55; i++) {
        const el = document.createElement('span');
        el.className = 'fx-cursor';
        el.textContent = cursors[Math.floor(Math.random() * cursors.length)];
        el.style.left = Math.random() * 100 + '%';
        el.style.top = Math.random() * 100 + '%';
        el.style.animationDuration = (1 + Math.random() * 2.5) + 's';
        el.style.animationDelay = (-Math.random() * 3) + 's';
        fxLayer.appendChild(el);
      }
    }

    function buildBootLog() {
      const lines = [
        '[ OK ] Started session bus',
        '[ OK ] Reached target network',
        '[ OK ] Mounted /dev/skelli',
        'loading security.module...',
        'loading terminal.theme...',
        '[ OK ] Started warp.service',
        'skelli@macbook login:',
        '[ OK ] Loaded mrs-skelli.key',
      ];
      let idx = 0;

      function addLine() {
        const line = document.createElement('div');
        line.className = 'fx-boot-line';
        line.textContent = lines[idx % lines.length];
        fxLayer.appendChild(line);
        if (fxLayer.children.length > 12) {
          fxLayer.removeChild(fxLayer.firstChild);
        }
        idx++;
      }

      addLine();
      trackTimer(setInterval(addLine, 900));
    }

    function buildPacketSniff() {
      function spawn() {
        const el = document.createElement('div');
        el.className = 'fx-packet';
        const a = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        const b = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        const c = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        const d = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        el.textContent = '0x' + a + ' ' + b + ' ' + c + ' ' + d + '  →  sniff';
        el.style.left = (5 + Math.random() * 85) + '%';
        el.style.top = (22 + Math.random() * 68) + '%';
        el.style.animationDuration = (2.5 + Math.random() * 2) + 's';
        fxLayer.appendChild(el);
        trackTimer(setTimeout(function () {
          el.remove();
        }, 4500));
      }

      for (let i = 0; i < 14; i++) spawn();
      trackTimer(setInterval(spawn, 450));
    }

    function buildPortScan() {
      const ports = [22, 53, 80, 443, 445, 1337, 3000, 4444, 8080, 8443, 9000, 27017];

      function placePort(el) {
        const side = Math.floor(Math.random() * 4);
        const offset = (10 + Math.random() * 75) + '%';
        if (side === 0) { el.style.top = '6%'; el.style.left = offset; }
        if (side === 1) { el.style.bottom = '6%'; el.style.left = offset; }
        if (side === 2) { el.style.top = offset; el.style.left = '3%'; }
        if (side === 3) { el.style.top = offset; el.style.right = '3%'; }
      }

      function scan() {
        fxLayer.querySelectorAll('.fx-port').forEach(function (el) { el.remove(); });
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const el = document.createElement('div');
          el.className = 'fx-port';
          el.textContent = ':' + ports[Math.floor(Math.random() * ports.length)];
          el.style.animationDelay = (i * 0.08) + 's';
          placePort(el);
          fxLayer.appendChild(el);
        }
      }

      scan();
      trackTimer(setInterval(scan, 650));
    }

    function buildHashRain() {
      const hex = '0123456789abcdef';
      const columns = Math.ceil(window.innerWidth / 72);

      for (let i = 0; i < columns; i++) {
        const col = document.createElement('div');
        col.className = 'fx-hash-column';
        col.style.left = (i * 72) + 'px';
        col.style.animationDuration = (5 + Math.random() * 5) + 's';
        col.style.animationDelay = (-Math.random() * 8) + 's';

        let hash = '';
        const rows = 12 + Math.floor(Math.random() * 10);
        for (let j = 0; j < rows; j++) {
          for (let k = 0; k < 6; k++) {
            hash += hex[Math.floor(Math.random() * 16)];
          }
          hash += '\n';
        }
        col.textContent = hash;
        fxLayer.appendChild(col);
      }
    }

    function initJsPattern(name) {
      fxLayer.classList.add('is-active', 'fx-' + name);
      if (name === 'cursor-field') buildCursorField();
      if (name === 'boot-log') buildBootLog();
      if (name === 'packet-sniff') buildPacketSniff();
      if (name === 'port-scan') buildPortScan();
      if (name === 'hash-rain') buildHashRain();
    }

    function setPattern(name) {
      if (!bgLayer || !patterns.includes(name)) return;

      clearFx();

      patterns.forEach(function (p) {
        bgLayer.classList.remove('bg-' + p);
      });

      if (matrixLayer) {
        matrixLayer.classList.remove('is-active');
      }

      if (name === 'matrix') {
        bgLayer.classList.add('bg-matrix');
        if (matrixLayer) matrixLayer.classList.add('is-active');
        buildMatrix();
      } else if (jsPatterns.has(name)) {
        bgLayer.classList.add('bg-none');
        initJsPattern(name);
      } else {
        bgLayer.classList.add('bg-' + name);
      }
    }

    function getSaved() {
      const saved = localStorage.getItem(THEME_KEY);
      const valid = saved && patterns.includes(saved) ? saved : DEFAULT;
      if (bootThemes.some(function (t) { return t.id === valid; })) {
        return valid;
      }
      return DEFAULT;
    }

    function save(name) {
      if (patterns.includes(name)) {
        localStorage.setItem(THEME_KEY, name);
      }
    }

    const manager = {
      setPattern: setPattern,
      getSaved: getSaved,
      save: save,
      destroy: clearFx
    };

    if (bgLayer) {
      managerCache.set(bgLayer, manager);
    }

    return manager;
  }

  function refsFromMainbg(mainbg) {
    return {
      bgLayer: mainbg.querySelector('#bg-layer'),
      matrixLayer: mainbg.querySelector('#matrix-layer'),
      fxLayer: mainbg.querySelector('#fx-layer')
    };
  }

  global.SkelliBg = {
    THEME_KEY: THEME_KEY,
    DEFAULT: DEFAULT,
    patterns: patterns,
    bootThemes: bootThemes,
    createManager: createManager,
    refsFromMainbg: refsFromMainbg
  };
})(window);
