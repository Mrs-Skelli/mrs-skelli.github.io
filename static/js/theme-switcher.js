(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const mainbg = document.getElementById('home-mainbg');
    const switcher = document.getElementById('theme-switcher');
    const btn = document.getElementById('theme-switcher-btn');
    const menu = document.getElementById('theme-switcher-menu');

    if (!mainbg || !switcher || !btn || !menu || !window.SkelliBg) return;

    const mgr = SkelliBg.initHomeTheme(mainbg);
    let isOpen = false;

    SkelliBg.bootThemes.forEach(function (theme) {
      const item = document.createElement('li');
      item.setAttribute('role', 'none');

      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'theme-switcher-option';
      option.dataset.pattern = theme.id;
      option.setAttribute('role', 'option');
      option.textContent = theme.label;
      option.addEventListener('click', function () {
        mgr.setPattern(theme.id);
        mgr.save(theme.id);
        updateActive(theme.id);
        closeMenu();
      });

      item.appendChild(option);
      menu.appendChild(item);
    });

    function updateActive(id) {
      menu.querySelectorAll('.theme-switcher-option').forEach(function (option) {
        const active = option.dataset.pattern === id;
        option.classList.toggle('is-active', active);
        option.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    function openMenu() {
      isOpen = true;
      switcher.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      isOpen = false;
      switcher.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      isOpen ? closeMenu() : openMenu();
    });

    document.addEventListener('click', function (e) {
      if (isOpen && !switcher.contains(e.target)) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) {
        closeMenu();
        btn.focus();
      }
    });

    function activate() {
      mgr.setPattern(mgr.getSaved());
      updateActive(mgr.getSaved());
      switcher.hidden = false;
      switcher.classList.add('is-ready');
    }

    document.addEventListener('skelli:boot-complete', activate, { once: true });
    if (!document.getElementById('boot-screen')) activate();
  });
})();
