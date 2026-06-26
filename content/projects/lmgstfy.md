---
title: "Let Me GitHub Search That For You"
date: 2026-06-25
draft: false
weight: 1
description: "A passive-aggressive LMGTFY clone for colleagues who refuse to search GitHub themselves."
summary: "One-file link generator that animates a fake GitHub search before sending people to the results they could have found in three seconds."
project_url: "https://lmgstfy.fun/"
source_url: "https://github.com/Mrs-Skelli/lmgstfy"
technologies: ["github", "javascript", "html"]
---

You know LMGTFY. *Let Me Google That For You.* The sacred art of generating a link, sending it to someone who asked a question they could have answered with a three-second search, and watching them sit through an animated cursor slowly type their query while passive-aggressive captions roll across the screen.

I needed that energy, but for GitHub.

## The Problem

If you work anywhere with code, you have met this person. They Slack you *"how does auth work in our API?"* You point them at the repo. They ask again. You point them at the repo *and* the search bar. They ask again, but louder.

Google has LMGTFY. GitHub did not have an equivalent. Until now.

## What it does

- **Two scopes** — search all of GitHub, or scope to a specific org or user's repos.
- **All the search types** — Code, Repositories, Issues, PRs, Commits, Discussions, Wikis, Packages, Users.
- **Deterministic snark** — the captions are derived from the query, so the same link always plays the same way. Consistency matters when you're being petty.
- **Preview before you send** — so you can enjoy the animation yourself before weaponising it.
- **Skip button for victims** — begrudgingly included. You're not a monster. (Debatable.)
- **Social cards** — Open Graph meta so the link looks respectable when you paste it in Slack. The disrespect is in the URL, not the preview.

## What it doesn't do

No tracking. No server. No build step. No npm install spiral. The entire app is one `index.html` file hosted on GitHub Pages. The query, scope, and search type are encoded in the URL — that's it. Open the link with no params and you get the creator UI. Open it with a `q` param and you get the player.

Honestly, you could have read the source yourself. But here you are.
