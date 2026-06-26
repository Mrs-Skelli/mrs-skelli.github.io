---
title: "Directory Listing to Super-Admin: How an Open Folder Handed Me the Keys"
date: 2026-06-03
draft: false
summary: "Open directories on a GLPI instance exposed live session files and a full database backup."
technologies: ["glpi", "php"]
vulnerabilities: ["directory-listing", "session-hijacking", "information-disclosure"]
---

# Directory Listing to Super-Admin: How an Open Folder Handed Me the Keys

---

## Preface

Nothing makes me happier than a good chain. Especially when the bug starts out as a low and escalates to a critical in a matter of minutes, or hours. On this company's unlucky day, that's precisely what I had. In this particular case, the server just has a folder open to the internet with everything inside it. This is one of those findings. Except, "everything inside it" turned out to be 368 active PHP session files, one of which belonged to a Super-Admin with write access across the entire platform.

On the same target, a publicly accessible backup directory handed me a full SQL dump of the application database. Two open directories. Two criticals. One very bad day for whoever owns this asset.

---

## The Target

The target was an IT asset management platform running GLPI, a popular open-source solution used by organisations to manage hardware inventories, support tickets, user accounts, and IT infrastructure. GLPI is widely deployed in enterprises and government environments, and it integrates with directory services like LDAP and Google Workspace, which makes privileged access to it particularly dangerous.

---

## Finding One: The Session Directory

You'll often hear me say that recon is one of the most important processes in hacking, and the reason for that is that during recon on this particular target, I identified a publicly accessible directory at `/_sessions/`. GLPI, like many PHP applications, stores session data on the filesystem. By default, PHP writes session files to a configurable path, and whoever deployed this instance had that path sitting inside the web root with directory listing enabled.

Navigating to the URL returned a clean Apache directory index: 368 files, timestamps, sizes. All of them PHP session files. All of them downloadable without authentication.

```
https://[REDACTED]/files/_sessions/
```

```
Index of /files/_sessions/
..
sess_0a1b2c3d4e5f...    2.3K    2026-05-11 14:22
sess_1f2e3d4c5b6a...    2.1K    2026-05-11 15:01
sess_5vs42v0p731d...    114K    2026-05-11 15:44   ← anomalous
...
```

Most session files were in the 2–3 KB range, which is normal for a standard authenticated user. One file was 114 KB. This immediately became more interesting to me, because that was not a standard user session. That's a session carrying something spicy!

---

## Parsing the Session

PHP session files are serialised using PHP's native serialisation format. Once downloaded, parsing the file revealed the full server-side session state for the account:

```
glpiactiveprofile|a:1:{s:4:"name";s:11:"Super-Admin";}
glpiprofiles|a:1:{i:4;s:11:"Super-Admin";}
glpishowallentities|b:1;
glpiID|i:15;
```

Breaking that down:

- `glpiactiveprofile` → **Super-Admin** (Profile ID 4)
- `glpishowallentities` → `true` aka access to the root entity and all child entities
- `glpiID` → User ID 15

The session also contained the full permission matrix for every GLPI module including tickets, assets, users, configuration, plugins and  all were set to write. The CSRF token for the active session was present too.

---

## Session Replay

PHP sessions are identified by a cookie. The filename of a PHP session file *is* the session ID. So to authenticate as this user, all I needed to do was set the session cookie to the filename I'd just downloaded and send any authenticated request to the application.

```
Cookie: glpi_[REDACTED]=[SESSION_ID_FROM_FILENAME];
```

Full Super-Admin access. No password. No MFA prompt. No challenge of any kind. The application accepted the session as valid and loaded the central GLPI dashboard with every administrative capability available.

---

## What Super-Admin Access Gets You

In GLPI, Super-Admin is the highest privilege level. With this access an attacker can:

- **Create or modify user accounts**, including granting Super-Admin to attacker-controlled accounts for persistent access that survives a session rotation
- **Exfiltrate everything**, such as IT asset inventories, user records, support ticket history, attached documents, all of which may contain credentials or sensitive internal communications
- **Modify LDAP and directory service configuration** thus enabling lateral movement into connected systems including Google Workspace or Active Directory
- **Destroy or manipulate backups** either to cover traces of compromise or to restore a prior state
- **Monitor the session directory continuously** since the directory was open, so a threat actor could poll it for newly created high-privilege sessions and automate persistent account takeover indefinitely

Even after a session expires, the file persists on disk. The full user profile, permission matrix, and entity structure remain readable. That's useful for mapping the organisation even without a live session to replay.

---

## Finding Two: The Backup Directory

While reviewing the same target, I checked sibling directories. Adjacent to `/_sessions/` sat `/_dumps/`.

```
https://[REDACTED]/files/_dumps/
```

Inside: a gzip-compressed SQL backup of the entire GLPI database, approximately 9.4 GB uncompressed based on the archive size and timestamp metadata.

```
glpi-backup-9.4.5-[REDACTED].sql.gz
```

A full database dump. It was completely downloadable without authentication and it contains every user record, every hashed password, every configuration value, every stored credential, and the full application schema. Bingo.

Combined with the session hijacking finding, this means an attacker who finds this asset has two independent paths to full compromise:

1. Replay an active Super-Admin session from `/_sessions/`
2. Extract password hashes and credentials from `/_dumps/` and crack or reuse them.

---

## The Chain in Summary

```
Web root misconfiguration (directory listing enabled)
            ↓
/_sessions/ accessible without authentication
            ↓
368 PHP session files downloadable
            ↓
114KB anomalous session identified → Super-Admin profile
            ↓
Session ID extracted from filename
            ↓
Cookie replay → full Super-Admin access, no credentials required
            ↓
+
/_dumps/ accessible without authentication
            ↓
Full SQL database backup downloadable
            ↓
All credentials, hashes, and configuration exposed offline
```

---

## Why This Happens

This class of finding is almost always the result of a deployment shortcut that never got cleaned up. PHP's default session save path is `/tmp`, which is not web-accessible, or at least, shouldn't be. Somewhere in the deployment or migration of this instance, the session path was configured to a subdirectory of the web root. Possibly because it was convenient, possibly to share state across a cluster, possibly just because someone wasn't thinking about it at the time.

The same logic applies to the backup directory. The SQL dumps get generated, stored locally for convenience, and then forgotten. Nobody thought to check whether the directory they landed in happens to be served by Apache.

The fix for both is the same concept: **nothing that isn't meant to be public should be inside the web root.** Session files, backups, logs, exports, absolutely all of it belongs outside the document root, with filesystem permissions that prevent the web server process from serving them even if someone misconfigures a path.

---

## Takeaways

Directory listing is easy to disable. Session files outside the web root is a one-line config change. These aren't hard problems they're just ones that require someone to check.

If you're running GLPI or any PHP application: go look at where your session files are being written. Then check if that path is inside your document root. Then check if directory listing is enabled on it.

That's it. That's the whole finding.