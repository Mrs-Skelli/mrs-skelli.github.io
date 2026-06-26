---
title: "The WAF Was There. It Just Wasn't Watching."
date: 2026-06-04
draft: false
summary: "Bypassing Cloudflare to reach an origin server exposing live financial data and plaintext database credentials."
technologies: ["cloudflare", "iis", "oracle"]
vulnerabilities: ["waf-bypass", "information-disclosure", "credential-exposure"]
---

# The WAF Was There. It Just Wasn't Watching.

---

## Preface

A Web Application Firewall is only useful if traffic actually goes through it. This is a finding about what happens when it doesn't  and what was sitting on the other side when I went around it.

A financial services platform had Cloudflare deployed in front of their production reporting server. From the outside, it looked protected. Direct requests to sensitive files were blocked. Everything seemed fine. Except the origin server was publicly reachable by IP, with no controls preventing anyone from bypassing Cloudflare entirely with a spoofed Host header.

Behind that bypass: live client account balances totalling tens of millions of in their local currency, ledger dispatch logs with direct PDF download links, and a plaintext Oracle database credential sitting in a `.txt` file in the web root.

---

## Reconnaissance

The target ran a WhatsApp-based financial dispatch service that had a backend that generated reports and pushed them to clients via WhatsApp. The application was hosted on Windows IIS and fronted by Cloudflare.

Standard recon surfaced the origin IP. This is a well-known Cloudflare weakness: if you can identify the actual origin server IP (through historical DNS records, certificate transparency logs, MX records, or direct IP scanning), you can send requests directly to it, bypassing everything Cloudflare provides including DDoS protection, WAF rules, bot detection, all of it.

Confirming the origin accepts direct connections is a one-liner:

```bash
curl -sk -o /dev/null -w "%{http_code}" \
  -H "Host: [REDACTED]" \
  "https://[ORIGIN_IP]/"
```

`403`. The virtual host responded. The origin was alive and accepting connections with a spoofed Host header. Cloudflare was not in the loop.

---

## What Was Sitting in the Web Root

With origin access confirmed, I started looking at what the application was serving. The directory structure followed a predictable pattern for a .NET IIS application, and the `WhatsAppApi_New` path caught my attention as it was the dispatch service, and dispatch services tend to write output files somewhere they can be served.

Four files. All `.txt`. All in the web root. All actively written.

`**Balance.Txt` — 1.3MB, actively updated**

```bash
curl -sk -H "Host: [REDACTED]" \
  "https://[ORIGIN_IP]/WhatsAppApi_New/Balance.Txt"
```

A 1.3MB plaintext file containing live client account balances, updated in real time. Every entry tied a client code to their current trading account balance and margin account balance. Real figures. Real client identifiers. No authentication.

To give that some context: one sample entry showed a trading account balance with A LOT of money in debit and a margin account with even more money in debit. This is regulated financial data, you know, the kind that has mandatory breach notification requirements attached to it under applicable data protection law.

`**Ledger.txt` — 1MB, actively updated**

WhatsApp dispatch logs. Every entry contained a direct download URL to a client's PDF ledger report, with the client code embedded in the filename:

```
Fin_S[CLIENTCODE][TIMESTAMP].Pdf
```

Anyone could download the file, get the client's full financial ledger. Enumerate the log, get every client's ledger. No authentication at any step.

`**REDACTED.Txt` — 80KB, actively updated**

This one was the kicker. Application error logs from the dispatch service, containing:

- Plaintext Oracle database credentials: `LDBO/[REDACTED]@[REDACTED]/LDBO`
- Client identifiers and CDSL demat holding parameters
- Full .NET stack traces
- Internal server filesystem paths
- A username, a password, an internal IP, and a database name. In a `.txt` file. In the web root.

`**Bal.txt` — 31KB**

A full enumeration list of every client code processed by the dispatch service. Not immediately exploitable on its own, but a complete client roster that makes every other finding worse.

---

## The Cloudflare Problem

Here's what makes this finding particularly frustrating from a defender's perspective. If you tried to access any of these files through the Cloudflare-proxied domain, you got nothing,or more likely: blocked, an empty response, which was expected. The WAF was doing its job.

```bash
curl -sk "https://[REDACTED]/WhatsAppApi_New/Balance.Txt"
# Empty response — Cloudflare blocks it
```

But through the origin IP with a spoofed Host header:

```bash
curl -sk -H "Host: [REDACTED]" \
  "https://[ORIGIN_IP]/WhatsAppApi_New/Balance.Txt"
# 1.3MB of live client financial data
```

The security team almost certainly believed these files were protected. They weren't. Cloudflare provides exactly zero protection if the origin server is directly reachable from the internet, and in this case it was, on port 443, responding to any connection that knew to send the right Host header.

This is an extremely common misconfiguration. Organisations stand up Cloudflare, point their DNS at it, and assume the origin is now hidden. But if the origin IP was ever public, like in old DNS records, certificate transparency logs, email headers, or anywhere else it's probably findable. Cloudflare's own documentation covers this: you need to configure the origin to only accept connections from Cloudflare's published IP ranges, or enforce mutual TLS via Cloudflare Authenticated Origin Pulls. Without one of those controls, Cloudflare is a suggestion, not a gate.

---

## Impact

Laid out plainly, this is what was accessible to any unauthenticated attacker who knew where to look:

- Live financial account data for every active client, updated in real time
- Direct download links to every client's PDF financial statements
- A full client roster for enumeration
- Plaintext credentials for the production Oracle database on the internal network
- Internal server architecture: filesystem paths, database connection strings, stack traces

The database credential exposure is the most immediately dangerous. `[REDACTED]` connecting to an internal Oracle instance. If that database is reachable from the application server, an attacker who pivots through the application server has direct database access. Even if it isn't, the credential is now known, and credential reuse is a real risk.

The financial data exposure has regulatory implications beyond technical remediation. Live client balance and ledger data is regulated information. The exposure of this data without authorisation likely triggers notification obligations under applicable data protection frameworks.

---

## Takeaways

Cloudflare is not a firewall if your origin is reachable by IP. This is not a novel attack technique, and it's actually documented. The fix is straightforward. The oversight is understandable, but the gap between "we have Cloudflare" and "our origin is locked down" is where a lot of sensitive data lives and gets exposed.

The files themselves are the second lesson: application output that gets written to disk tends to accumulate in whatever directory was convenient at the time, and that directory is often inside the web root. Balance files, ledger exports, log dumps. If the application can write it, the web server can serve it. Unless someone explicitly prevents that, it will.

Two misconfigurations. Neither of them complicated. A very bad outcome.