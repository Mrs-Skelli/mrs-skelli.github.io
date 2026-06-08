---
title: "Six Findings in 10 Minutes: A Free Pentest Story"
date: 2026-06-08
draft: false
description: "A portfolio pentest that escalated into six findings on a university recruitment platform: a Burp-flagged CVSS 10.0 RCE I confirmed, unauthenticated PII, exposed Actuator, and secrets in a JS bundle."
summary: "Six findings in ten minutes on a Next.js portfolio and its connected Spring Boot university platform."
technologies: ["nextjs", "react", "spring-boot", "vercel", "cloudflare"]
vulnerabilities: ["rce", "information-disclosure", "misconfiguration", "credential-exposure"]
---

# Six Findings in 10 Minutes: A Free Pentest Story

## Too Long, Didn't Read

A developer friend asked me to pentest their portfolio site. Scope expanded to a production university recruitment platform with 20,000+ student records. Burp flagged a CVSS 10.0 RCE, which I confirmed, along with unauthenticated PII enumeration on a live student data API, Spring Boot Actuator fully exposed, and a hardcoded webhook in a public JavaScript bundle. Six findings total. Wrote it all up and delivered it the same day, and all in a matter of **minutes.** I was given permission on 8 June, 2026 19:45 and by 19:54, I already had my first crit.

---

## Preface

I offer free pentests to people. Friends, developers, whoever reaches out. It's good practice, it benefits them, and I almost always find something. This one came in over Discord. A developer building their personal portfolio site wanted to know how far I could get. The message said "no limitations" and "go wild." That's my favourite kind of scope.

What started as a portfolio review turned into something significantly more interesting within the first minute.

---

## The Target

The target is a full stack developer. Their portfolio is built on Next.js, deployed on Vercel, sitting behind Cloudflare. Clean setup. A few pages, a contact form, a blog feed pulling from Medium. On the surface, not a lot to poke at.

But there was also a second subdomain. And a third. And a Spring Boot API. And 124 documented endpoints. And actual student data.

Let me back up.

---

## Recon

I started with what I always start with: DNS, headers, tech stack. Cloudflare IPs on the main domain, so the origin is hidden. `x-powered-by: Next.js` in the response headers. Turbopack build, App Router, server components. The build is using a React 19 canary from November 2025.

That detail matters. I'll come back to it.

Burp was running passively in the background while I did this. I hadn't sent a single manual request yet.

`robots.txt` was unremarkable. `sitemap.xml` had two entries. `manifest.json` confirmed it was a PWA. Nothing exciting yet.

Then I started pulling JS chunks.

---

## Finding 4: A Webhook in the Bundle

Next.js bundles everything for the client. That's the deal. If you write something in a component and it ends up client-side, it's in the JavaScript. It gets served to every visitor. Anyone can read it. DevTools is all it takes.

I pulled the chunks and ran regex across them looking for `fetch(`, API patterns, tokens, anything credential-shaped. One chunk came back with a full Discord webhook URL in a `fetch()` call. Not in a server action. Not in an API route. Directly in a React component, firing from the user's browser to Discord's API.

The contact form was posting submissions straight to a Discord webhook. The webhook token was just... there. In the bundle. For everyone. If you don't already know, Discord webhooks should be treated like secrets. People can use the webhook to spam or even delete the webhook entirely, which already happened here.

I probed it. It came back 404, with a Discord error code 10015, `Unknown Webhook`. Already rotated or the channel deleted. Which I thought was good, until I realized that may not have been intentional, but the code still had the pattern baked in, and the next token committed would be equally public from the moment of deployment.

---

## Finding 1: CVSS 10.0

While I was doing that JS analysis, Burp's passive scanner had been quietly doing its thing. It flagged a CVSS 10.0 RCE against the portfolio site.

React Server Components, the architecture Next.js uses under the hood, had a critical vulnerability published earlier this year: `CVE-2025-55182` and `CVE-2025-66478`. The short version is that the RSC Flight protocol doesn't validate property existence in colon-delimited reference strings. A malformed multipart POST body, specifically a reference `["$1:a:a"]`, causes the server to attempt to deserialize an invalid property chain. That throws an unhandled exception. In vulnerable configurations, that primitive is exploitable for unauthenticated remote code execution on the Node.js process.

CVSS 10.0. No authentication. No user interaction. No special configuration.

I confirmed what Burp had found with a 500 response and a Next.js error digest. I did not deploy a full RCE payload against production:

```
0:{"a":"$@1","f":"","b":"[BUILD_ID]"}
1:E{"digest":"3718766479"}

```

That digest is the fingerprint. The server failed to handle the reference. The affected version was React `19.3.0-canary-52684925-20251110` which is a November 2025 canary build that should never have been running on a public-facing production site. Canary builds aren't production releases. They don't get security patches. This one was vulnerable.

The request that triggers it looks like this:

```http
POST / HTTP/2
Host: [REDACTED]
Content-Type: multipart/form-data; boundary=yf6thz7m0luy8flb
Next-Action: [ACTION_HASH]
Next-Router-State-Tree: [""]

--yf6thz7m0luy8flb
Content-Disposition: form-data; name="1"

{}
--yf6thz7m0luy8flb
Content-Disposition: form-data; name="0"

["$1:a:a"]
--yf6thz7m0luy8flb--
```

Patched versions exist. React 19.0.1, 19.1.2, 19.2.1, and any stable non-canary release. Next.js 15.3.6 or newer. The fix is a version bump and a redeploy.

---

## The Subdomain

The JS bundle for the developer's portfolio contained a reference to a subdomain I hadn't found in DNS enumeration: a separate Next.js app. Burp's JS Miner extension caught it in a chunk.

That subdomain turned out to be a recruitment and attendance platform the developer had built for their university as a contract project. Spring Boot backend, Next.js frontend, Redis caching, AWS EC2, WebSocket pipelines. A real production system handling placement season for thousands of students.

The frontend chunk also contained:

```javascript
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://[REDACTED-API]/api"

```

A third subdomain. The actual backend API, and a note that auth tokens were being pulled from `sessionStorage` and attached as Bearer headers, meaning there was a real authentication system, with real routes behind it.

I started probing.

---

## Finding 5: The Entire API is Documented, Publicly

`/api-docs` returned a full OpenAPI 3.1.0 spec. 124 endpoints. Thankfully, no authentication required to read it. Every single route, HTTP method, path parameter, and request body schema. The security scheme definition (Bearer JWT) was right there too, which is almost funny because the spec correctly documents that auth is required, while being entirely readable without any.

Among the endpoints I noted:

```
POST  /api/admin/attendance-post
POST  /api/attendance/admin/override
POST  /api/bulk/register-students
POST  /api/students/send-mail-in-bulk
GET   /api/debug/attendance/timeslot/{id}
GET   /api/faculty/analytics/export/csv
GET   /api/statistics/crt-eligible-count

```

There was also a debug endpoint in production alongside a bulk email sender and of course an admin attendance override. The API also documented a CSV export of faculty analytics which was handed to me on a plate. I was loving this pentest already.

---

## Finding 3: Actuator

Spring Boot ships with a management interface called Actuator. It's a set of endpoints that expose runtime information about the application: health status, environment configuration, internal bean graph, JVM metrics, Prometheus scrape data.

It's also meant to be locked down before you go to production. This one wasn't.

`/actuator` returned a full index of available sub-endpoints. All of them were accessible without authentication:

- `/actuator/env`: environment property sources. Sensitive values are masked, but the key names are visible. You can see the shape of what secrets exist, even if you can't read the values.
- `/actuator/beans`: full internal bean graph with fully qualified Java class names and package paths. A detailed map of the application internals.
- `/actuator/prometheus`: JVM metrics, database connection pool statistics, HTTP request latency histograms, cache hit rates.

This is reconnaissance infrastructure. It doesn't give an attacker credentials directly, but it tells them what's running, how it's structured, and where to look.

---

## Finding 2: Real Names, No Auth

This was the one that made me stop and message the developer before going any further.

Three endpoints on the API returned user records including full names, email addresses, internal UUIDs, and role assignments, with no authentication token required.

```
GET /api/users          → 200 OK  (full user list)
GET /api/users/paginated → 200 OK  (paginated, includes Admin account)
GET /api/users/getFacs  → 200 OK  (all faculty accounts)

```

The OpenAPI spec declared global Bearer JWT security. The endpoints didn't enforce it. Spring Security access control simply wasn't applied to these routes. The data that came back was real. Real names, real institutional email addresses, real role assignments. Faculty accounts and an admin account. There were also internal UUIDs that could be used as inputs in further attacks against student attendance records.

I didn't pull the full list. I confirmed the endpoint returned data, took a sample for the report, and stopped. The platform handles thousands of students' placement and attendance records. That data belongs to people who didn't authorize this pentest. The developer had given me permission on their own assets, but there's a line between testing access controls and actually collecting university staff PII en masse, and I wasn't going to cross it, so I flagged it immediately and paused that thread of testing.

---

## Finding 6: Architecture - An Honorable Mention

The last finding is less dramatic but worth documenting because it's the root cause of the webhook issue and probably a broader pattern.

The contact form sends visitor data (name, email, and project description) directly to an external API from the browser. The data passes through the visitor's browser before it reaches its destination, which means any intercepting proxy, browser extension, or injected script can see it. Anyone can script a loop and flood the endpoint. It can be triggered cross-origin from any page. Therefore, moving the call server-side also fixes the rate-limiting gap, and you can apply it in one place without depending on client behaviour.

---

## How This Happens

None of this was careless. The developer is clearly talented and the platform they built for the university is genuinely impressive engineering. Real-time WebSocket pipelines, Redis caching, sub-100ms API responses under placement season load. That's not a beginner project.

The vulnerabilities here are architectural defaults and easy misses:

- React canary builds aren't production releases. Version pins matter.
- Environment variables with `NEXT_PUBLIC_` go to the browser. Everything else stays server-side.
- Spring Boot Actuator ships open. You have to close it.
- Spring Security doesn't auto-apply to all routes. You have to configure it explicitly.
- Documenting Bearer auth in your OpenAPI spec does not enforce it. Spring Security authorization is not magic. You have to write the rules.

The recurring theme: frameworks don't protect you by default. They give you the tools and then let you misconfigure them in production.

---

## What Happened

The developer received the report as soon as I wrote it up. All six findings, full reproduction steps, remediation code for each one. I asked if I could write it up publicly and publish on my blog. To which they said yes, with everything anonymized.

This is that writeup.

---

## Technical Summary


| ID   | Finding                                                       | Severity |
| ---- | ------------------------------------------------------------- | -------- |
| F-01 | React Server Components RCE (CVE-2025-55182 / CVE-2025-66478), confirmed via Burp | Critical |
| F-02 | Unauthenticated faculty/user PII enumeration                  | High     |
| F-03 | Spring Boot Actuator fully exposed                            | High     |
| F-04 | Discord webhook hardcoded in client JS bundle                 | High     |
| F-05 | Unauthenticated OpenAPI spec (124 endpoints)                  | Medium   |
| F-06 | Contact form client-side webhook architecture                 | Medium   |


---

## Resources

- [CVE-2025-55182](https://www.cve.org/CVERecord?id=CVE-2025-55182)
- [CVE-2025-66478](https://www.cve.org/CVERecord?id=CVE-2025-66478)
- [Next.js Security Advisories](https://nextjs.org/blog/security-advisories)
- [Spring Boot Actuator: Production Ready Features](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [Spring Security: Authorize HTTP Requests](https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html)

