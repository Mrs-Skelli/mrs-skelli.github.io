---
title: "FCKeditor in 2026, an MD5 Bypass, and a Very Open Directory"
date: 2026-06-04
draft: false
summary: "Open directories, an unauthenticated FCKeditor upload connector, stored XSS, and a hardcoded MD5 backdoor in client-side JavaScript."
technologies: ["fckeditor", "ckeditor", "apache"]
vulnerabilities: ["directory-listing", "file-upload", "xss", "credential-exposure", "misconfiguration"]
---

# FCKeditor in 2026, an MD5 Bypass, and a Very Open Directory

---

## Preface

If you've read my other blog posts, you'll notice I do a lot of chaining of vulnerabilities. For once, this one writeup is an exception. Instead of a complex chain, I found bugs stacked on top of each other across a handful of subdomains, all belonging to the same organisation. None of them required any authentication to find or exploit. One of them involved FCKeditor which is a file editor that was deprecated in 2010, that is running in production in 2026.

This write-up shows you, dear reader, what happens when an organisation's attack surface accumulates technical debt quietly, in the corners of web apps where devs never check.

---

## The Target

The target was a packaging tools company. A relatively small attack surface, though with multiple subdomains, multiple applications, on one shared organisation. I found three distinct findings across two of them, each independently exploitable, each making the others worse.

---

## Finding One: The Open Directory

The first thing I hit was directory listing enabled across multiple paths on the main application subdomain. Not one directory, but **six**.

```
https://[REDACTED]/followup/upload/
https://[REDACTED]/followup/files/
https://[REDACTED]/followup/documentation/
https://[REDACTED]/followup/tinymce/
https://[REDACTED]/followup/calendar/
https://[REDACTED]/followup/ckeditor/
https://[REDACTED]/followup/ckeditor/filemanager/browser/default/
```

Every one of them returned a clean Apache directory index. No authentication. With full visibility into the application's file structure, upload history, documentation, and most importantly, the file manager for the editor component. This marked a very good start for my engagement and that last path is where things got interesting.

---

## Finding Two: FCKeditor is Alive (Somehow)

Inside the exposed CKEditor directory sat a file manager connector:

```
/followup/ckeditor/filemanager/connectors/php/connector.php
```

FCKeditor, later rebranded as CKEditor, shipped a PHP file manager connector in its older versions that accepted file upload commands via HTTP POST with zero authentication. This was a well-known vulnerability class. FCKeditor was deprecated in 2010. It's so old, I had to research what the technology even was. The connector has been on exploit lists for well over a decade, yet it was running here, in 2026 and shamelessly accepting unauthenticated file uploads.

The connector accepts a `Command`, `Type`, and `CurrentFolder` parameter. Sending a `FileUpload` command with a malicious file drops it directly into a web-accessible directory:

```bash
curl -X POST "https://[REDACTED]/followup/ckeditor/filemanager/connectors/php/connector.php\
?Command=FileUpload&Type=File&CurrentFolder=/hadrian/" \
  -F "NewFile=@/tmp/payload.xml;filename=payload.xml"
```

Response:

```
window.parent.OnUploadCompleted(0,
"/followup/upload/uploads/file/hadrian/payload.xml",
"payload.xml", "")
```

Status `0` means success. The file is now sitting at a publicly accessible URL.

---

## Finding Three: XSLT-Based Stored XSS

The upload accepting arbitrary file types opened the door to stored XSS. XML files served back by the application can carry an XSLT stylesheet reference, and if the browser renders the XML inline rather than forcing a download, that stylesheet executes JavaScript in the context of the domain.

The payload:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="data:text/xml,
  <xsl:stylesheet version='1.0'
    xmlns:xsl='http://www.w3.org/1999/XSL/Transform'>
    <xsl:template match='/'>
      <html><body>
        <script>alert('XSS: ' + document.domain)</script>
      </body></html>
    </xsl:template>
  </xsl:stylesheet>"?>
<root><test>payload</test></root>
```

Upload it via the connector, then navigate to the uploaded file URL. Alert box fires with `[REDACTED]`, confirming JavaScript execution in the context of the application domain.

This is stored XSS. Meaning the file persists on the server. Anyone who navigates to the URL triggers it, and no interaction from an (un)authenticated user required to plant it, only to trigger it.

---

## Finding Four: The MD5 That Unlocks Everything

On a second subdomain belonging to the same organisation, a different application, a page builder framework, had its own problem. Inside a minified production JavaScript file, buried in the authentication logic for a privileged dialog, sat this:

```javascript
if (passwd === pPasswordToMatch ||
    passwd === "[REDACTED CREDENTIAL]") {
    pDefer.resolve({type:"ok"});
```

Which was an MD5 hash that is essentially, a hardcoded backdoor. Regardless of what the correct password is, entering the cracked value of this hash will always resolve the dialog as authenticated. It's an OR condition, the match the real password *or* match this hash.

Cracking it took seconds on any public hash lookup service. The plaintext password was mine.

This isn't just a weak password, it's also a hardcoded bypass baked into the client-side JavaScript of a production application, shipped to every user who loads the page, and crackable by anyone who bothers to look, such as me. This one took mere seconds, since the has had been cracked by a hash-cracking website. 

---

## Takeaways

FCKeditor has been deprecated for fifteen years. Its file manager connector has been an exploit target for almost as long. Finding it in a production application in 2026 is a sign that the application hasn't been substantively reviewed or updated since it was first deployed, which makes a great case for continuous pentesting, or just getting a pentest in general.

The MD5 backdoor is a different kind of problem altogether, and it suggests that at some point, someone intentionally added a hardcoded bypass to a production application, shipped it in client-side JavaScript, and either forgot about it or assumed nobody would look. Either way, both assumptions were wrong.

These findings don't require sophisticated techniques. They require looking. If you're running applications that have been in production for more than a few years without a security review, there's a reasonable chance something like this is in there.

