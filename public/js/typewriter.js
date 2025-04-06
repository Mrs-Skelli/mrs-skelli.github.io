// Creating new script file

// Terminal-style typewriter effect
document.addEventListener('DOMContentLoaded', function() {
  const textElement = document.querySelector('.animatedText');
  
  // Only run typewriter if the element exists
  if (textElement && typeof textArray !== 'undefined' && textArray.length > 0) {
    let textArrayIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let pauseDuration = 2000; // Pause at end of phrase

    function type() {
      const currentPhrase = textArray[textArrayIndex];
      
      if (isDeleting) {
        // Removing characters
        textElement.textContent = currentPhrase.substring(0, charIndex - 1) + '█';
        charIndex--;
      } else {
        // Adding characters
        textElement.textContent = currentPhrase.substring(0, charIndex + 1) + '█';
        charIndex++;
      }

      // Typing speed - more random to look like actual typing
      let typingSpeed = isDeleting ? 50 : Math.random() * 50 + 70;

      // If word is complete, start deleting after pause
      if (!isDeleting && charIndex === currentPhrase.length) {
        // Pause at the end of phrase
        isDeleting = true;
        typingSpeed = pauseDuration;
      } else if (isDeleting && charIndex === 0) {
        // Move to next phrase after deletion
        isDeleting = false;
        textArrayIndex = (textArrayIndex + 1) % textArray.length;
      }

      setTimeout(type, typingSpeed);
    }

    // Start the typewriter effect after a short delay
    setTimeout(type, 1000);
  }
});
