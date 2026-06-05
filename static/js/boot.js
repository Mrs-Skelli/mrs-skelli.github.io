(function () {
  function initTheme(mainbg) {
    return window.SkelliBg ? SkelliBg.initHomeTheme(mainbg) : null;
  }

  function revealTerminal(terminal, onDone) {
    requestAnimationFrame(function () {
      terminal.classList.remove('boot-hidden');
      if (onDone) setTimeout(onDone, 600);
    });
  }

  function finishBoot(bootScreen, terminal, themeMgr, selectedTheme) {
    if (themeMgr && selectedTheme) themeMgr.save(selectedTheme);

    setTimeout(function () {
      bootScreen.classList.add('is-done');
      document.body.classList.remove('booting');
      document.body.classList.add('boot-done');
      sessionStorage.setItem('skelli-boot-seen', '1');

      setTimeout(function () {
        bootScreen.remove();
        revealTerminal(terminal, function () {
          document.dispatchEvent(new Event('skelli:boot-complete'));
        });
      }, 520);
    }, 350);
  }

  function skipBoot(bootScreen, terminal, mainbg) {
    if (bootScreen) bootScreen.remove();
    const themeMgr = initTheme(mainbg);
    if (themeMgr) themeMgr.setPattern(themeMgr.getSaved());
    terminal.classList.remove('boot-hidden');
    document.body.classList.remove('booting');
    document.dispatchEvent(new Event('skelli:boot-complete'));
  }

  function showThemePicker(bootScreen, linesContainer, terminal, mainbg) {
    const themeMgr = initTheme(mainbg);
    if (!themeMgr) {
      finishBoot(bootScreen, terminal, null, null);
      return;
    }

    let selected = themeMgr.getSaved();
    themeMgr.setPattern(selected);

    const picker = document.createElement('div');
    picker.className = 'boot-theme-picker';
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-label', 'Choose background theme');

    const title = document.createElement('p');
    title.className = 'boot-theme-title';
    title.textContent = 'Select terminal.theme:';
    picker.appendChild(title);

    const list = document.createElement('div');
    list.className = 'boot-theme-list';
    list.setAttribute('role', 'listbox');

    SkelliBg.bootThemes.forEach(function (theme) {
      list.appendChild(SkelliBg.createBootThemeButton(
        theme,
        'boot-theme-option',
        theme.id === selected,
        function (patternId, btn) {
          selected = patternId;
          themeMgr.setPattern(selected);
          list.querySelectorAll('.boot-theme-option').forEach(function (option) {
            option.classList.toggle('is-active', option === btn);
          });
        }
      ));
    });

    picker.appendChild(list);

    const launch = document.createElement('button');
    launch.type = 'button';
    launch.className = 'boot-theme-launch';
    launch.textContent = '→ launch terminal';

    function launchTerminal() {
      document.removeEventListener('keydown', onKeydown);
      finishBoot(bootScreen, terminal, themeMgr, selected);
    }

    function onKeydown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        launchTerminal();
      }
    }

    launch.addEventListener('click', launchTerminal);
    document.addEventListener('keydown', onKeydown);
    picker.appendChild(launch);

    linesContainer.classList.add('is-collapsed');
    bootScreen.classList.add('boot-screen--picker');
    bootScreen.appendChild(picker);

    requestAnimationFrame(function () {
      picker.classList.add('is-visible');
    });
  }

  function runLoadingLine(container, text, onDone) {
    const line = document.createElement('div');
    line.className = 'boot-line boot-line-loading';
    container.appendChild(line);

    let dots = 0;
    const interval = setInterval(function () {
      dots = (dots + 1) % 4;
      line.textContent = text + '.'.repeat(dots);
    }, 180);

    setTimeout(function () {
      clearInterval(interval);
      line.textContent = text + '............. done';
      onDone();
    }, 900);
  }

  function runBootSequence(bootScreen, linesContainer, terminal, mainbg) {
    const bootLines = [
      'Skelli OS 2.6.0 (warp terminal edition)',
      '',
      '[ OK ] Started skeleton.service',
      '[ OK ] Mounted /dev/brain',
      '[ OK ] Loaded mrs-skelli.key',
      '[ OK ] Reached target network-online.target',
      '[ OK ] Started security-researcher.target',
      { loading: true, text: 'loading terminal.theme' },
      '',
      'login: skelli',
    ];

    document.body.classList.add('booting');
    let index = 0;

    function nextLine() {
      if (index >= bootLines.length) {
        setTimeout(function () {
          showThemePicker(bootScreen, linesContainer, terminal, mainbg);
        }, 400);
        return;
      }

      const entry = bootLines[index];
      index++;

      if (typeof entry === 'object' && entry.loading) {
        runLoadingLine(linesContainer, entry.text, function () {
          setTimeout(nextLine, 120);
        });
        return;
      }

      const line = document.createElement('div');
      line.className = 'boot-line';
      if (entry === '') {
        line.className += ' boot-line-spacer';
        line.textContent = '\u00a0';
      } else {
        line.textContent = entry;
      }
      linesContainer.appendChild(line);

      const delay = entry === '' ? 180 : 90 + Math.random() * 70;
      setTimeout(nextLine, delay);
    }

    nextLine();
  }

  document.addEventListener('DOMContentLoaded', function () {
    const bootScreen = document.getElementById('boot-screen');
    const linesContainer = document.getElementById('boot-lines');
    const terminal = document.getElementById('terminal-window');
    const mainbg = document.getElementById('home-mainbg');

    if (!bootScreen || !linesContainer || !terminal) {
      document.dispatchEvent(new Event('skelli:boot-complete'));
      return;
    }

    const shouldSkip = sessionStorage.getItem('skelli-boot-seen') === '1' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (shouldSkip) {
      skipBoot(bootScreen, terminal, mainbg);
      return;
    }

    runBootSequence(bootScreen, linesContainer, terminal, mainbg);
  });
})();
