(function () {
  function readPhrases() {
    const el = document.getElementById('typewriter-phrases');
    if (!el) return [];

    try {
      let parsed = JSON.parse(el.textContent.trim());
      // Older Hugo builds double-encoded the JSON as a string.
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      return Array.isArray(parsed) ? parsed.filter(function (phrase) {
        return typeof phrase === 'string' && phrase.length > 0;
      }) : [];
    } catch (error) {
      return [];
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var started = false;

    function startTypewriter() {
      if (started) return;
      const textElement = document.querySelector('.animatedText');
      const phrases = readPhrases();

      if (!textElement || phrases.length === 0) return;
      started = true;

      let textArrayIndex = 0;
      let charIndex = 0;
      let isDeleting = false;
      const pauseDuration = 2000;

      function type() {
        const currentPhrase = phrases[textArrayIndex];

        if (isDeleting) {
          textElement.textContent = currentPhrase.substring(0, charIndex - 1);
          charIndex--;
        } else {
          textElement.textContent = currentPhrase.substring(0, charIndex + 1);
          charIndex++;
        }

        let typingSpeed = isDeleting ? 50 : Math.random() * 50 + 70;

        if (!isDeleting && charIndex === currentPhrase.length) {
          isDeleting = true;
          typingSpeed = pauseDuration;
        } else if (isDeleting && charIndex === 0) {
          isDeleting = false;
          textArrayIndex = (textArrayIndex + 1) % phrases.length;
        }

        setTimeout(type, typingSpeed);
      }

      setTimeout(type, 600);
    }

    const bootScreen = document.getElementById('boot-screen');
    if (bootScreen) {
      document.addEventListener('skelli:boot-complete', startTypewriter, { once: true });
      if (!document.body.contains(bootScreen) || document.body.classList.contains('boot-done')) {
        startTypewriter();
      }
    } else {
      startTypewriter();
    }
  });
})();
