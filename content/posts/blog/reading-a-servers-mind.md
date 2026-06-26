---
title: "Reading the Server's Mind: Path Traversal to Environment Variable Leak"
date: 2026-06-05
draft: false
summary: "Path traversal via a name parameter exposed /proc/self/environ and leaked a CLIENT_SECRET from the running process."
technologies: ["linux"]
vulnerabilities: ["path-traversal", "information-disclosure", "credential-exposure"]
---

# Reading the Server's Mind: Path Traversal to Environment Variable Leak

---

## Preface

Path traversal is probably one of the oldest vulnerability classes in web security, outside of maybe injection attacks. (I should know, cross-site scripting and I are the same age.) The concept is simple: a user input that gets used to construct a file path, without proper sanitisation, it can be manipulated to read files outside the intended directory. When that path happens to be `/proc/self/environ` on a Linux server, you're not just reading a file, you're reading the process environment of the running web application, which often contains secrets that were never meant to leave the server.

---

## The Finding

The web application accepted a `name` parameter in its query string. The parameter appeared to control some kind of content or template lookup, which is the kind of thing that often ends up reading a file from disk. Testing for path traversal is straightforward: try to escape the intended directory with `../` sequences and request a known file. If you know what kind of system it is, it makes default or obvious files easy to guess, otherwise, a good wordlist and ffuf will solve your problem if it exists. When I tried:

```
https://[REDACTED]/?name=../../../proc/self/environ
```

The server responded with the contents of `/proc/self/environ` which is the full environment variable block for the running process, newline-delimited, rendered directly in the response.

Among the variables was something particularly delicious: `CLIENT_SECRET`.

---

## Why `/proc/self/environ` Matters

On Linux systems, `/proc/self/environ` is a virtual file that exposes the environment variables of the currently running process. For a web application, that means everything that was set in the environment at startup, which typically includes:

- Database connection strings and credentials
- API keys and OAuth secrets
- Signing keys and encryption secrets
- Internal service URLs
- Application configuration that shouldn't be public

Unlike reading a config file, which might require knowing the exact path and filename, `/proc/self/environ` is always at the same location and always contains the current runtime environment. It's one of the most reliably high-value targets for any path traversal or LFI vulnerability.

`CLIENT_SECRET` in particular suggests an OAuth or API authentication secret, aka, the kind of value used to sign tokens, authenticate to external services, or verify incoming requests. Exposure of this value allows an attacker to forge authenticated requests, impersonate the application to downstream services, or in some configurations, generate valid access tokens.

---

## Exploitation Path

The immediate impact is credential exposure. Depending on what `CLIENT_SECRET` authenticates:

- If it's an OAuth client secret, an attacker can use it to request access tokens for any scope the application is authorised for
- If it's an HMAC signing key, an attacker can forge signed requests that the application or its downstream services will trust
- If it's an API key for a third-party service, that service is now accessible to the attacker

Beyond the specific secret, the full environment dump provides a complete map of the application's external dependencies, internal service topology, and configuration, all useful for planning further attacks.

---

## The Exploit

The exploit was simple, all I needed to do was send the following request:

```
GET /?name=../../../proc/self/environ HTTP/1.1
Host: [REDACTED]
```

and all your `CLIENT_SECRET` belong to me.

---

## Takeaways

A path traversal to `/proc/self/environ` is not a new technique. It's been in the toolkit for years, but it keeps working because applications keep accepting user input and using it to construct file paths without proper validation. I expect this to become increasingly more popular as we get more inexperienced devs and vibecoding.

The `name` parameter here looked innocuous, and was probably a template or content identifier in normal use, but without validation, it was a direct read handle to the server's runtime environment. One parameter, one request, one `CLIENT_SECRET`.

If your application ever uses user-supplied input to look up a file, that lookup needs an allowlist., not a denylist, not sanitisation. An allowlist of exactly what values are permitted, with everything else rejected.