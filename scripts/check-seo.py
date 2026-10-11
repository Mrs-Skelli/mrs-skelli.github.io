#!/usr/bin/env python3
"""Validate crawl and metadata invariants in a rendered Hugo site."""

from __future__ import annotations

import json
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


BASE_URL = "https://skelli.win"
SITEMAP_NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


class RenderedPage(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title_parts: list[str] = []
        self.in_title = False
        self.meta: list[dict[str, str]] = []
        self.links: list[dict[str, str]] = []
        self.h1_count = 0
        self.images: list[dict[str, str]] = []
        self.times: list[dict[str, str]] = []
        self.json_ld: list[str] = []
        self.in_json_ld = False
        self.json_ld_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        if tag == "title":
            self.in_title = True
        elif tag == "meta":
            self.meta.append(values)
        elif tag == "link":
            self.links.append(values)
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "img":
            self.images.append(values)
        elif tag == "time":
            self.times.append(values)
        elif tag == "script" and values.get("type") == "application/ld+json":
            self.in_json_ld = True
            self.json_ld_parts = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False
        elif tag == "script" and self.in_json_ld:
            self.in_json_ld = False
            self.json_ld.append("".join(self.json_ld_parts))

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)
        if self.in_json_ld:
            self.json_ld_parts.append(data)

    @property
    def title(self) -> str:
        return "".join(self.title_parts).strip()

    def metadata(self, key: str) -> list[str]:
        key = key.lower()
        return [
            item.get("content", "")
            for item in self.meta
            if (item.get("name") or item.get("property") or item.get("http-equiv", "")).lower()
            == key
        ]

    def link(self, rel: str) -> list[str]:
        return [
            item.get("href", "")
            for item in self.links
            if rel in item.get("rel", "").lower().split()
        ]


def output_file(public_dir: Path, url_path: str) -> Path:
    if url_path == "/":
        return public_dir / "index.html"
    return public_dir / url_path.lstrip("/") / "index.html"


def output_url(public_dir: Path, file_path: Path) -> str:
    relative = file_path.relative_to(public_dir).as_posix()
    if relative == "index.html":
        return "/"
    if relative.endswith("/index.html"):
        return f"/{relative[:-10]}"
    return f"/{relative}"


def schema_types(value: object) -> set[str]:
    found: set[str] = set()
    if isinstance(value, dict):
        value_type = value.get("@type")
        if isinstance(value_type, str):
            found.add(value_type)
        for child in value.values():
            found.update(schema_types(child))
    elif isinstance(value, list):
        for child in value:
            found.update(schema_types(child))
    return found


def parse_page(path: Path) -> RenderedPage:
    page = RenderedPage()
    page.feed(path.read_text(encoding="utf-8"))
    return page


def main() -> int:
    public_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "public").resolve()
    errors: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            errors.append(message)

    sitemap_path = public_dir / "sitemap.xml"
    robots_path = public_dir / "robots.txt"
    require(sitemap_path.is_file(), "missing sitemap.xml")
    require(robots_path.is_file(), "missing robots.txt")
    require((public_dir / "index.xml").is_file(), "missing root RSS feed (index.xml)")
    if errors:
        print("SEO validation failed:\n- " + "\n- ".join(errors), file=sys.stderr)
        return 1

    sitemap = ET.parse(sitemap_path)
    sitemap_urls = [node.text or "" for node in sitemap.findall(".//s:loc", SITEMAP_NS)]
    require(len(sitemap_urls) == len(set(sitemap_urls)), "sitemap contains duplicate URLs")

    pages: dict[str, RenderedPage] = {}
    titles: dict[str, list[str]] = {}
    descriptions: dict[str, list[str]] = {}
    for url in sitemap_urls:
        parsed = urlparse(url)
        require(f"{parsed.scheme}://{parsed.netloc}" == BASE_URL, f"off-domain sitemap URL: {url}")
        file_path = output_file(public_dir, parsed.path)
        require(file_path.is_file(), f"sitemap URL has no rendered file: {url}")
        if not file_path.is_file():
            continue

        page = parse_page(file_path)
        pages[parsed.path] = page
        descriptions_for_page = page.metadata("description")
        robots = ",".join(page.metadata("robots")).lower()

        require(bool(page.title), f"missing title: {url}")
        require(len(descriptions_for_page) == 1 and bool(descriptions_for_page[0]), f"missing description: {url}")
        require(page.link("canonical") == [url], f"canonical mismatch: {url} -> {page.link('canonical')}")
        require("noindex" not in robots and "nofollow" not in robots, f"sitemap page is not indexable: {url}")
        require(page.h1_count == 1, f"expected one H1, found {page.h1_count}: {url}")
        for image in page.images:
            require("alt" in image, f"image missing alt attribute on {url}: {image.get('src', '')}")

        expected_social = ["og:title", "og:description", "og:url", "og:type", "twitter:card", "twitter:title", "twitter:description"]
        for field in expected_social:
            require(bool(page.metadata(field)), f"missing {field}: {url}")

        parsed_schema: list[object] = []
        for block in page.json_ld:
            try:
                parsed_schema.append(json.loads(block))
            except json.JSONDecodeError as error:
                errors.append(f"invalid JSON-LD on {url}: {error}")
        types = schema_types(parsed_schema)
        if parsed.path == "/":
            require({"Person", "ProfilePage", "WebSite"}.issubset(types), "homepage schema must include Person, ProfilePage, and WebSite")
        elif parsed.path.startswith("/posts/blog/") and parsed.path != "/posts/blog/":
            require("BlogPosting" in types, f"research post missing BlogPosting schema: {url}")
            require(any(item.get("datetime") for item in page.times), f"research post missing semantic publication date: {url}")

        titles.setdefault(page.title, []).append(url)
        descriptions.setdefault(descriptions_for_page[0] if descriptions_for_page else "", []).append(url)

    for title, urls in titles.items():
        require(len(urls) == 1, f"duplicate title {title!r}: {', '.join(urls)}")
    for description, urls in descriptions.items():
        require(len(urls) == 1, f"duplicate description {description!r}: {', '.join(urls)}")

    sitemap_set = set(sitemap_urls)
    for file_path in public_dir.rglob("*.html"):
        page = parse_page(file_path)
        page_url = output_url(public_dir, file_path)
        robots = ",".join(page.metadata("robots")).lower()
        refresh = page.metadata("refresh")
        canonicals = page.link("canonical")
        if refresh:
            require("noindex" in robots, f"alias page must be noindex: {page_url}")
            require(len(canonicals) == 1, f"alias page must have one canonical: {page_url}")
        elif "noindex" not in robots and canonicals and canonicals[0].startswith(BASE_URL):
            require(canonicals[0] in sitemap_set, f"indexable canonical page omitted from sitemap: {page_url}")

    robots = robots_path.read_text(encoding="utf-8")
    require("User-agent: *\nAllow: /" in robots, "robots.txt must allow the general crawler group")
    require(f"Sitemap: {BASE_URL}/sitemap.xml" in robots, "robots.txt has the wrong Sitemap directive")

    if errors:
        print("SEO validation failed:\n- " + "\n- ".join(errors), file=sys.stderr)
        return 1
    print(f"SEO validation passed: {len(sitemap_urls)} canonical sitemap pages checked")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
