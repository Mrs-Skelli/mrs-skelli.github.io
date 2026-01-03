<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Cyberpunk nonsense and writeups">
    
    <!-- Bootstrap 5 (Grid Only) -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" 
          integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    
    <!-- Terminal Theme Meta Tags -->
    <meta name="theme-color" content="#000000">
    
    <title>Skelli - Research</title>
    
    <style>
/* Terminal Theme for skelli.win */

:root {
  --terminal-blue: #007acc;
  --terminal-bright-blue: #39a5ff;
  --terminal-dim-blue: #00477a;
  --terminal-black: #000;
  --terminal-dark: #111;
  --terminal-gray: #333;
  --terminal-header: #222;
  --terminal-text: #c8e1ff;
  --terminal-cursor: #39a5ff;
}

html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: var(--terminal-black);
  color: var(--terminal-text);
  font-family: 'Courier New', monospace;
  font-size: 16px;
  line-height: 1.6;
  font-weight: normal;
  letter-spacing: 0.3px;
}

.mainbg {
  position: relative;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background-color: var(--terminal-black);
  overflow-x: hidden;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 50px;
}

/* Terminal window styling */
.terminal-window {
  background-color: var(--terminal-black);
  border: 1px solid #444;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.7);
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 8px;
}

.terminal-header {
  background-color: #2d2d2d;
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #333;
}

.terminal-title {
  color: #aaa;
  font-size: 13px;
  text-align: center;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.terminal-controls {
  display: flex;
  gap: 7px;
}

.control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
}

.control:nth-child(1) {
  background-color: #ff5f57;
}

.control:nth-child(2) {
  background-color: #febc2e;
}

.control:nth-child(3) {
  background-color: #28c840;
}

.terminal-content {
  padding: 15px;
  min-height: 400px;
}

.container, article, .about-content, .post-card {
  background-color: var(--terminal-black);
  border: 1px solid var(--terminal-blue);
  box-shadow: 0 0 10px var(--terminal-dim-blue);
  padding: 20px;
  margin-bottom: 20px;
  position: relative;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

/* Terminal prompt styling */
.terminal-prompt {
  color: var(--terminal-bright-blue);
  margin-bottom: 5px;
  margin-top: 15px;
  font-weight: bold;
}

.terminal-prompt::before {
  content: "$ ";
  color: var(--terminal-bright-blue);
}

/* Cursor blinking effect */
.content::after, .card-title::after, .welcome-message .animatedText::after {
  content: "█";
  animation: blink 1s steps(1) infinite;
  color: var(--terminal-cursor);
  font-weight: normal;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  color: var(--terminal-bright-blue);
  font-family: 'Courier New', monospace;
  margin-top: 20px;
  margin-bottom: 10px;
  font-weight: bold;
}

h1 {
  font-size: 2.5em;
}

h2 {
  font-size: 2em;
}

h3 {
  font-size: 1.5em;
}

/* Terminal-style links */
a {
  color: var(--terminal-bright-blue);
  text-decoration: underline;
  transition: all 0.2s ease;
}

a:hover {
  color: var(--terminal-bright-blue);
  text-decoration: underline;
  background-color: var(--terminal-gray);
}

/* Terminal style buttons */
.btn-outline-light, .btn-primary {
  background-color: var(--terminal-black);
  color: var(--terminal-blue);
  border: 1px solid var(--terminal-blue);
  padding: 8px 16px;
  font-family: 'Courier New', monospace;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  margin-right: 5px;
  margin-bottom: 5px;
}

.btn-outline-light:hover, .btn-primary:hover {
  background-color: var(--terminal-blue);
  color: var(--terminal-black);
}

/* Typewriter effect */
.animatedText {
  color: var(--terminal-bright-blue);
  font-size: 1.4em;
  min-height: 1.5em;
  margin-bottom: 20px;
  display: inline-block;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  letter-spacing: 0.5px;
  padding: 5px 0;
}

/* Nav buttons */
.contentbtn {
  display: flex;
  flex-wrap: wrap;
  margin-top: 10px;
}

/* Code blocks */
pre {
  background-color: var(--terminal-dark);
  border-left: 3px solid var(--terminal-dim-blue);
  color: var(--terminal-bright-blue);
  padding: 15px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  margin: 15px 0;
}

code {
  font-family: 'Courier New', monospace;
  color: var(--terminal-bright-blue);
  background-color: var(--terminal-dark);
  padding: 2px 4px;
}

/* Lists with terminal-style bullets */
ul {
  list-style-type: none;
  padding-left: 20px;
}

ul li::before {
  content: "> ";
  color: var(--terminal-bright-blue);
  font-weight: bold;
  display: inline-block;
  width: 1em;
  margin-left: -1em;
}

ol {
  padding-left: 20px;
}

ol li::marker {
  color: var(--terminal-bright-blue);
}

/* Terminal scrollbar */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: var(--terminal-black);
}

::-webkit-scrollbar-thumb {
  background: var(--terminal-blue);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--terminal-bright-blue);
}

/* Blog post cards */
.post-card {
  height: 100%;
  transition: all 0.3s ease;
  overflow: hidden;
}

.post-card:hover {
  box-shadow: 0 0 15px var(--terminal-blue);
}

.post-card .card-title {
  color: var(--terminal-bright-blue);
  font-size: 1.5em;
  margin-bottom: 10px;
}

.post-card .card-subtitle {
  color: var(--terminal-dim-blue);
  margin-bottom: 10px;
}

.post-card .card-text {
  color: var(--terminal-text);
}

/* Terminal CRT effect */
.mainbg::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
  background-size: 100% 4px;
  z-index: 2;
  pointer-events: none;
  opacity: 0.15;
}

/* Footer styling */
footer {
  color: var(--terminal-blue);
  text-align: center;
  margin-top: 30px;
  padding: 10px;
  border-top: 1px solid var(--terminal-blue);
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

/* Typography adjustments */
p {
  margin-bottom: 1em;
  letter-spacing: 0.3px;
  word-spacing: 1px;
}

/* Welcome message */
.welcome-message {
  margin-bottom: 20px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--terminal-dim-blue);
  border-top: 1px dashed var(--terminal-dim-blue);
}

/* File listing styling */
.file-listing {
  margin: 10px 0 20px;
  font-family: 'Courier New', monospace;
}

.file-item {
  margin-bottom: 15px;
  padding-left: 5px;
  border-left: 2px solid var(--terminal-dim-blue);
}

.file-name {
  font-weight: bold;
  display: block;
}

.file-name a {
  color: var(--terminal-bright-blue);
  text-decoration: none;
}

.file-name a:hover {
  text-decoration: underline;
}

.file-date {
  color: var(--terminal-dim-blue);
  font-size: 0.9em;
  padding-left: 10px;
}

.file-summary {
  margin-top: 5px;
  margin-bottom: 5px;
  color: var(--terminal-text);
  padding-left: 10px;
  border-left: 1px dotted var(--terminal-dim-blue);
  letter-spacing: 0.3px;
  word-spacing: 1px;
}

/* Content title */
.content-title {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--terminal-blue);
}

.content-title h1 {
  margin-bottom: 0;
}

/* Additional readability improvements */
li {
  letter-spacing: 0.3px;
  word-spacing: 1px;
}

/* Update text colors for better contrast */
p, .file-summary, .card-text {
  color: var(--terminal-text);
}

/* Fix white background issues */
.container, .terminal-window, article, .about-content, .post-card, .file-item {
  background-color: var(--terminal-black);
}

.row, .col-lg-4, .col-md-6, .posts-list, .file-listing, .content-container {
  background-color: var(--terminal-black);
}

/* Fix file listing text colors */
.file-summary {
  color: var(--terminal-text);
}

/* Fix post cards */
.post-card .card-body {
  background-color: var(--terminal-black);
  color: var(--terminal-text);
}

/* Fix content container */
.content-container {
  color: var(--terminal-text);
}

/* Improve contrast for links */
a {
  color: var(--terminal-bright-blue);
  text-decoration: underline;
  transition: all 0.2s ease;
}

/* Better contrast for terminal title */
.terminal-title {
  color: var(--terminal-text);
}

/* Override Bootstrap backgrounds */
.container, .container-fluid, .row, [class^="col-"], .card, .card-body {
  background-color: var(--terminal-black) !important;
  color: var(--terminal-text) !important;
}

/* Ensure content is visible */
body, html, .mainbg, .terminal-window, .terminal-content {
  background-color: var(--terminal-black) !important;
}

/* Fix for any Bootstrap spacing that might expose white background */
.container, .row, .col, [class^="col-"] {
  padding: 0 !important;
  margin: 0 !important;
}

/* Only add margins back to content containers */
.terminal-window {
  margin: 0 auto !important;
  max-width: 800px !important;
}

/* Better contrast for muted text */
.text-muted {
  color: var(--terminal-dim-blue) !important;
  opacity: 0.9;
}

/* Date styling */
.terminal-date {
  color: var(--terminal-bright-blue);
  opacity: 0.8;
  font-size: 0.9em;
  margin-top: 5px;
  font-style: italic;
}

/* Improve code highlighting */
code, pre {
  color: var(--terminal-bright-blue);
  background-color: var(--terminal-dark);
  border: 1px solid var(--terminal-dim-blue);
  border-radius: 3px;
}

pre {
  padding: 15px;
  overflow-x: auto;
}

pre code {
  border: none;
  padding: 0;
}

/* Improve link visibility */
a:not(.btn) {
  color: var(--terminal-bright-blue);
  text-decoration: underline;
  transition: all 0.2s ease;
  font-weight: bold;
}

a:not(.btn):hover {
  color: #ffffff;
  background-color: var(--terminal-dim-blue);
}

/* Increase contrast for all text */
.terminal-content, .content, .file-summary, .card-text, p, li {
  color: #d8e8ff !important;
}

.card {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #00ff00;
    border-radius: 8px;
    padding: 1.5rem;
    transition: all 0.3s ease;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.card:hover {
    transform: translateY(-5px);
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    border-color: #00ff00;
}

.card-title {
    color: #00ff00;
    margin-bottom: 1rem;
    font-size: 1.5rem;
}

.card-subtitle {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1rem;
}

.card-text {
    color: #ccc;
    flex: 1;
}

.btn-primary {
    color: #00ff00;
    background-color: transparent;
    border: 1px solid #00ff00;
    font-weight: bold;
    transition: all 0.3s ease;
}

.btn-primary:hover {
    color: #000;
    background-color: #00ff00;
    text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}
    </style>
</head>
<body style="background-color: black; color: #d8e8ff;">
    <div class="mainbg">
        <div class="terminal-window">
            <div class="terminal-header">
                <span class="terminal-title">Skelli ~ warp</span>
                <span class="terminal-controls">
                    <span class="control"></span>
                    <span class="control"></span>
                    <span class="control"></span>
                </span>
            </div>
            <div class="terminal-content">
                <p class="terminal-prompt">Last login: <?php echo date('D M j H:i:s'); ?> on ttys000</p>
                <p class="terminal-prompt">skelli@macbook ~ % whoami</p>
                <p>Security researcher</p>
                
                <p class="terminal-prompt">skelli@macbook ~ % cat welcome.txt</p>
                <div class="welcome-message">
                    <div class="animatedText"></div>
                </div>
                
                <p class="terminal-prompt">skelli@macbook ~ % ls -la links/</p>
                <div class="contentbtn">
                    <a href="https://skelli.win/about" class='btn btn-outline-light' role='button' target="_blank" rel="noopener">About</a>
                    <a href="https://skelli.win/posts" class='btn btn-outline-light' role='button' target="_blank" rel="noopener">Blog Posts</a>
                    <a href="https://digitaloverdose.tech/" class='btn btn-outline-light' role='button' target="_blank" rel="noopener">Digital Overdose</a>
                    <a href="https://github.com/Mrs-Skelli" class='btn btn-outline-light' role='button' target="_blank" rel="noopener">Github</a>
                    <a href="https://bsky.app/profile/skelli@skelli.win" class='btn btn-outline-light' role='button' target="_blank" rel="noopener">BlueSky</a>
                    <a href="https://infosec.exchange/@Mrs_Skelli" class='btn btn-outline-light' role='button' target="_blank" rel="noopener">Mastodon</a>
                    <a href="https://www.linkedin.com/in/💀-eden-stroet-b9b3b2201/?originalSubdomain=nl" class='btn btn-outline-light' role='button' target="_blank" rel="noopener">LinkedIn</a>
                </div>
                
                <p class="terminal-prompt">skelli@macbook ~ % cat README.md</p>
                <div style="margin-top: 15px; padding: 15px; border: 1px solid var(--terminal-dim-blue); border-radius: 4px; background-color: rgba(0, 74, 122, 0.1);">
                    <h3 style="color: var(--terminal-bright-blue); margin-top: 0; margin-bottom: 10px;">Research Domain</h3>
                    <p style="color: var(--terminal-text); margin-bottom: 10px; line-height: 1.6;">
                        This is a research subdomain used for security testing and vulnerability research purposes.
                    </p>
                    <p style="color: var(--terminal-text); margin-bottom: 10px; line-height: 1.6;">
                        If you notice any traffic or interactions originating from <strong style="color: var(--terminal-bright-blue);">research.skelli.win</strong> in your logs, it's possible that security researchers, penetration testers, or bug bounty hunters have been testing your application.
                    </p>
                    <p style="color: var(--terminal-text); margin-bottom: 0; line-height: 1.6;">
                        You should investigate the endpoints where these interactions were generated from. If a vulnerability exists, examine the root cause and take the necessary steps to remediate the issue.
                    </p>
                </div>
            </div>
        </div>
    </div>

    <footer class="footer py-3 mt-5">
        <div class="container text-center">
            <span class="text-muted">© <?php echo date('Y'); ?> Skelli. All rights reserved.</span>
        </div>
    </footer>

    <!-- JS for typewriter -->
    <script>
        const textArray = ["Hacker", "Skeleton with Sudo Access", "Chaos Itself", "Anxiety as a Service", "Therapy via Terminal", "Shell Gremlin"];
        
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
    </script>
</body>
</html>

