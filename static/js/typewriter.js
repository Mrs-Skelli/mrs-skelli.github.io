(function () {
  function readPhrases() {
    const el = document.getElementById('typewriter-phrases');
    if (!el) return [];

    try {
      const parsed = JSON.parse(el.textContent);
      return Array.isArray(parsed) ? parsed.filter(function (phrase) {
        return typeof phrase === 'string' && phrase.length > 0;
      }) : [];
    } catch (error) {
      return [];
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    function startTypewriter() {
      const textElement = document.querySelector('.animatedText');
      const phrases = readPhrases();

      if (!textElement || phrases.length === 0) return;

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

    if (document.getElementById('boot-screen')) {
      document.addEventListener('skelli:boot-complete', startTypewriter, { once: true });
    } else {
      startTypewriter();
    }
  });
})();
