---
title: "WordPress Gave Away 8,000 Files and Nobody Noticed"
date: 2026-06-05
draft: false
summary: "An unauthenticated WordPress REST media endpoint exposed 8,000+ internal PDFs, decks, and spreadsheets including a full RFP response."
technologies: ["wordpress"]
vulnerabilities: ["information-disclosure", "broken-access-control"]
---

# WordPress Gave Away 8,000 Files and Nobody Noticed

---

## Preface

WordPress's REST API is one of the most consistently underestimated attack surfaces in enterprise web security. It ships enabled by default, it's well-documented, and it exposes a lot more than most content teams realise when they upload files to the media library. It's one of my favorite technologies to spot during a pentest because hacking it can be so easy, and so satisifying. The following write-up is about what happens when a large organisation uses WordPress as their public website, uploads internal business documents to it for convenience, and leaves the media endpoint wide open.

The answer: 8,118 PDFs, 152 PPTX files, and 58 XLSX files which were all enumerable and downloadable without authentication. Including what appeared to be a full client RFP response broken across multiple decks, and an unreleased webinar.

---

## The Endpoint

WordPress exposes its media library via the REST API at:

```
/wp-json/wp/v2/media
```

By default, this endpoint is unauthenticated and returns paginated metadata for every file in the media library. Usually it's just published media, so the leak isn't very impressive, but in this particular case it was more than just the published files, meant to be served to the public. It included files that were never linked to any published page. Those are referred to as orphaned media, and they're the most interesting ones, because they represent files that were uploaded intentionally, but never made public through the normal CMS workflow. They're essentially internal drafts, or working documents, some were even presentations that got superseded or RFP responses. You get the point.

Querying the endpoint for PDFs:

```
https://[REDACTED]/wp-json/wp/v2/media?per_page=100&mime_type=application/pdf&orderby=date&order=desc
```

Returns paginated JSON with metadata for every PDF in the library, including `source_url` which is the direct download link.

---

## What Was There

Paginating through the results surfaced 8,118 PDFs, 152 PPTX files, and 58 XLSX files. Most were legitimate public assets, press releases, published reports, marketing collateral. However, mixed in were files that clearly had no business being publicly accessible as well.

The most significant: a full RFP response broken across six PPTX decks, apparently prepared for a major consumer goods company. The filenames were descriptive:

```
[REDACTED]-rfp-INTRO.pptx
[REDACTED]-rfp-TEAM.pptx
[REDACTED]-rfp-TRANSITION.pptx
[REDACTED]-rfp-COMMERICAL.pptx
[REDACTED]-rfp-DATA.pptx
[REDACTED]-rfp-TECH.pptx
[REDACTED]-rfp-APPENDIX.pptx
```

This was a complete RFP submission including the pricing, team structure, commercial terms, technical approach, you know, the kind of document that represents significant competitive intelligence if it ends up with the wrong people. All of it downloadable by anyone who knew to query the media endpoint.

There was also a webinar presentation deck dated in the future at time of discovery that had a pre-uploaded file for an upcoming event that wasn't yet public, freely accessible days before it was supposed to be released.

---

## Identifying Orphaned Media

Not every file returned by the media endpoint is intentionally public. To identify files that were uploaded but never linked to any published content, aka the orphaned files, you cross-reference the media endpoint results against the pages and posts endpoints:

```
/wp-json/wp/v2/pages
/wp-json/wp/v2/posts
```

Files that appear in the media library but have no `post` association in the API response, or whose parent post ID resolves to a draft or private post, are orphaned. They exist in the media library but are reachable only by knowing or guessing the URL, or by querying the API like I did.

The REST API removes the "security by obscurity" that might otherwise protect these files. You don't even need to guess filenames, the API happily hands you the full list.

---

## Why This Keeps Happening

The WordPress media library is designed for a specific workflow: upload an image or document, embed it in a post, publish. In that workflow, the assumption is that anything in the media library is going to end up on a published page anyway, so accessibility is the right default.

That assumption breaks down in practice for a few reasons:

- Content teams upload working documents to the media library as a convenient file store, without realising they're making them publicly accessible
- Files get uploaded for a draft post that never gets published, leaving the file accessible even though the post isn't
- Documents get superseded and removed from published pages, but the media library entry, and the direct URL to access it remains available to anyone querying the API.
- Large organisations with multiple content contributors have no centralised oversight of what's been uploaded

The REST API makes all of this exploitable at scale. Instead of needing to find individual files, an attacker can enumerate the entire library in minutes.

---

## The Exploit

The exploit is fairly simple, as you start by querying the media endpoint for PDFs:

```
GET /wp-json/wp/v2/media?per_page=100&mime_type=application/pdf&orderby=date&order=desc
```

Then you just inspect the `source_url` fields in the response. Paginate through all results. After that you just cross-reference against pages and posts to identify orphaned media and download and review files for sensitive content.

---

## Impact

An unauthenticated threat actor could in theory enumerate and download the full media library contents, which in this case contained 8,000+ files without any credentials or interaction with the site's public interface. 

---

## Takeaways

The WordPress REST API is not a hidden feature. It's a documented, and default-enabled interface that any cyber criminal familiar with WordPress will check. The media endpoint in particular is a reliable source of files that content teams didn't realise were publicly enumerable.

So, if you're running WordPress at an enterprise scale with multiple contributors uploading documents, you need a media audit and a governance policy. The REST API will expose everything that's been uploaded, whether or not it was ever linked to a published page.

Check your `/wp-json/wp/v2/media` endpoint. If it returns results without authentication, you have the same problem.

