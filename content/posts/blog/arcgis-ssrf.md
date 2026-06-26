---
title: "The Proxy That Trusted Everyone: SSRF in ArcGIS Portal"
date: 2026-06-06
draft: false
summary: "Misconfigured ArcGIS Portal proxy endpoints forwarded requests to attacker-controlled URLs on two instances."
technologies: ["arcgis"]
vulnerabilities: ["ssrf", "misconfiguration"]
---

# The Proxy That Trusted Everyone: SSRF in ArcGIS Portal

---

## Preface

Server-Side Request Forgery is one of those vulnerability classes that looks innocuous on the surface. "The server makes a request on your behalf" until you think about what the server can reach that you can't. Internal APIs, cloud metadata endpoints, admin interfaces behind firewalls. SSRF turns a public-facing application into a pivot point for accessing infrastructure that was never meant to be internet-facing.

ArcGIS Portal ships with a proxy endpoint intended to forward requests to pre-approved external services for map data and tile layers. When that allowlist is misconfigured because the company buries these safety configurations 54 pages into the docs, the proxy will forward requests to any destination, including ones the attacker specifies.

---

## The Target

Two ArcGIS Portal instances belonging to the same organisation, both exposing the same misconfiguration on the same endpoint:

```
/portal/sharing/proxy
```

ArcGIS Portal's proxy is documented feature. It exists to allow the client-side JavaScript application to make cross-origin requests to approved external map services without running into CORS restrictions. The proxy is supposed to validate destination URLs against an `allowedReferers` configuration before forwarding. When that configuration is permissive or missing, it forwards to anything.

---

## Confirming the SSRF

The test is straightforward. Pass an external URL as a query parameter to the proxy endpoint and observe whether the server fetches it:

```
GET /portal/sharing/proxy?http://hadrian.io/ HTTP/1.1
Host: [REDACTED]
Accept: */*
Referer: https://[REDACTED]/portal/apps/mapviewer/index.html
Accept-Encoding: gzip, deflate, br
```

The server responded with the contents of `hadrian.io` which is fetched server-side and returned through the proxy. Confirmed on both instances.

Both the primary mapping portal and the secondary instance were vulnerable. Same misconfiguration, two exposed endpoints, one organisation.

---

## What SSRF Enables Here

Confirming outbound connectivity to an external host is just the starting point. The more impactful targets for an SSRF in a cloud or enterprise environment are internal:

**Cloud metadata endpoints:**

```
http://169.254.169.254/latest/meta-data/
http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

On AWS, Azure, or GCP, the instance metadata service is reachable from any process on the host. SSRF with access to the metadata endpoint can leak IAM credentials, instance identity, and configuration — often leading to privilege escalation in the cloud environment.

**Internal network services:**
The server can reach hosts on its internal network that are not accessible from the internet. Admin panels, internal APIs, database management interfaces, monitoring dashboards — anything bound to an internal IP is potentially reachable through the proxy.

**Firewall bypass:**
Outbound requests originate from a trusted internal host. Services that allowlist the application server's IP for internal access will accept requests forwarded through this proxy as if they came from a trusted source.

I confirmed the vulnerability using an external callback but did not probe internal infrastructure — testing stopped at proof of concept to avoid any risk of unintended access to internal systems.

---

## Steps to Reproduce

1. Send the following request to the first instance:

```
GET /portal/sharing/proxy?http://hadrian.io/ HTTP/1.1
Host: [REDACTED]
Referer: https://[REDACTED]/portal/apps/mapviewer/index.html
```

Observe the response contains the content of `hadrian.io`, fetched server-side.

1. Repeat against the second instance:

```
GET /portal/sharing/proxy?http://hadrian.io/ HTTP/1.1
Host: [REDACTED]
Referer: https://[REDACTED]/portal/apps/mapviewer/index.html
```

Same result confirmed.

---

## Remediation

- **Configure the `allowedReferers` property** in the ArcGIS Portal proxy configuration to an explicit allowlist of approved destination domains. Reject any request targeting a host not on the allowlist.
- **Disable wildcard or unconstrained destinations** — `*` or empty allowedReferers permits all destinations and should never be used in production.
- **Block requests to RFC 1918 address ranges and cloud metadata endpoints** at the proxy level and at the network level — the proxy should never be able to reach `169.254.169.254`, `10.0.0.0/8`, `172.16.0.0/12`, or `192.168.0.0/16`.
- **Audit both instances** for any evidence of prior exploitation — review proxy access logs for requests to internal IP ranges or metadata endpoints.
- Refer to Esri's documentation on proxy configuration: the `allowedReferers` property controls which destination URLs the proxy will forward to and must be explicitly configured.

---

## Takeaways

ArcGIS Portal's proxy is a legitimate feature that becomes dangerous when its allowlist is not configured. This is a known misconfiguration class for ArcGIS deployments — Esri's documentation covers it, and it appears regularly in security assessments of GIS infrastructure.

The fact that both instances had the same misconfiguration suggests it wasn't an accident — it was likely a default that was never revisited. Default configurations that permit unrestricted outbound proxying are a pattern across many enterprise software products. The lesson is the same as always: deploy with explicit allowlists, not permissive defaults, and verify the configuration rather than assuming the software is safe out of the box.

---

*Still Hacking Anyway*