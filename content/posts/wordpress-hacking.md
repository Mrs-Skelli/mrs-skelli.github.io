---
title: "WordPress Hacking Tips"
date: 2025-08-02
draft: true
description: "Tips and tricks I've learned along the way when hacking WordPress websites."
---

# Index
1. Introduction (optional)
2. Reconnisance 
3. Exploits
4. Other
5. Security Researchers
6. Conclusion (optional)

# Introduction

So you want some tips and tricks to hack WordPress websites. This guide you've found will become a living, breathing document of things I learned. This is not going to be exhaustive, but I'm hoping to link tips and tricks I've learned and pull in other people's work to establish a decent WordPress hacking guide. WordPress powers approximately 43% of websites online, and yet, I don't know any good resources that cover WordPress hacking in depth beyond WordFence, or Patchstack, but those focus less on the actual exploits and assisting hackers or security researchers more-so than being a CNA, advisory or bug bounty platform. Therefore, I'm amassing useful or common exploits, or even new exploits that we may discover along the way. Want to have an exploit included? Email wordpress@skelli.win and I'll review and include it here.

# Recocnisance 

This section is to aid in security researchers WordPress in improving their recon skills when hacking WordPress websites. Below will be a list of cURL commands that will hopefully aid in uncovering potential plugins, versions, or things that may be missed by neat tools like WordPress Scan. 

1. Exposing unauthenticated endpoints:

```
curl -s 'https://example.com/wp-json/wp/v2/posts?per_page=100' | jq '.[].content.rendered'
```

I've personally used this one to view files that were behind authentication but exposed thanks to the WordPress API. 


2. Crawling the Sitemap

```
curl -s "https://www.example.com/wp-sitemap-posts-page-1.xml" | grep -oP '(?<=<loc>).*?(?=</loc>)'
```

3. Exposing custom post types:

```
curl -s 'https://example.com/wp-json/wp/v2/types'
```

4. 

```
curl -s -k https://www.example.com/wp-json/wp/v2/view-template/[id]| jq '.content.rendered'
```

5. 
```
curl -s https://example.com/wp-json/ | jq '."routes" | keys[]'
```

6. Potential method to view unpublished pages:

```
curl -s 'https://example.com/wp-json/wp/v2/search?search=test&subtype[]=any' | jq .
```
OR

```
curl -s 'https://example.com/wp-json/wp/v2/posts?per_page=100&page=1' | jq
```
Could potentially expose sensitive files or unpublished posts

7.
```
curl -s https://example.com/wp-json/ | jq '."routes" | to_entries[] | {route: .key, methods: .value.methods}'
```

8. 

```
curl -s 'https://www.example.com/wp-json/wp/v2/pages?per_page=100' | jq '.[].link'
```

9. Can potentially leak attachments or unpublished media:


```
curl -s 'https://example.com/wp-json/wp/v2/media?parent=26314' | jq
```

10. Can catch orphaned media:

```
for i in {1..30000}; do
  curl -s "https://example.com/wp-json/wp/v2/media/$i" | jq -r '.source_url' 2>/dev/null
done | grep -v "null"
```