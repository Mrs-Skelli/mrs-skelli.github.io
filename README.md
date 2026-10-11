# mrs-skelli.github.io

## Local validation

Build the production site and validate its crawl/indexing invariants:

```sh
hugo --gc --minify --cleanDestinationDir
python3 scripts/check-seo.py public
```

The validator checks the sitemap against rendered pages, including canonical URLs,
indexability, unique titles and descriptions, social metadata, heading structure,
image alternative text, JSON-LD, alias pages, robots.txt, and the RSS feed.
