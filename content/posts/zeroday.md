---
title: "Baby's First 0day?"
date: 2025-12-27
draft: false
description: "The painstaking process of responsibly disclosing a vulnerability for it to be completely ignored."
summary: "A timeline breaking down the responsible disclosure process from finding to failure."
---

# Preface

As this vulnerability is not yet patched, I am intentionally withholding all technical details until the standard 90-day disclosure window has elapsed. As of 27 December 2025, approximately two months remain. Full technical details will be published on 25 February 2026.

* This post intentionally avoids describing the vulnerability class, affected components, or exploitation mechanics. A full technical analysis will be published only after coordinated disclosure timelines have elapsed and with employer approval.

# The Finding
I work in offensive security for a living, which is ironic because my official title reflects the Blue Team. The truth is, I do both, and I like doing both, but I'd be lying to you if I said I didn't enjoy hacking more than defending. Breaking things comes naturally to me, and sometimes, it happens accidentally. That's how I found this bug: on accident. 

I was working on a routine pentest on behalf of my company. This particular target had a focused scope and required a thorough and methodical approach. I spent the first four days of my time doing as much recon as possible, because everything I looked at felt very static. The most interesting aspects, were some WordPress websites. (Believe it or not, this will not be about WordPress today!) However, one of them had more to it than meets the eye. 

I had already spent a plethora of manual efforts on this, and I was feeling frustrated with a lack of impactful findings. So I utilised one of my favorite tools. BurpSuite. I began an automated scan which means I had to filter through some noisy informational findings, but that's the name of the game. 

I didn't have much hope for Burp to be completely honest, because there were maybe only 100 assets in scope, counting domains, IPs, ports and certificates, but my bestie never lets me down. Burp flagged within an hour of scanning a [REDACTED] asset. I thought "I've seen this asset, that can't be right." This led me to pulling in some additional help, of a trusted colleague with nearly two decades of experience. 

I asked them for a confidence check and watching their eyes light up brought back what I thought was lost hope. So they sent me a lovely research paper about the vulnerability class I was staring at. I skimmed it, and found a section with payloads. It seemed unconventional, and unlikely to work, but I had nothing to lose and everything to gain. So I copied the first one and [REDACTED]. 

Unbelievable, the first payload worked?

[Technical details intentionally withheld until 25 February 2026]

This application is called [REDACTED]. The technology stack is a bit peculiar as it's running [REDACTED] for the backend, and [REDACTED] for front-end. This project is open source, so the code was accessible. This allowed me to sift through it and find the culprit:

[Technical details intentionally withheld until 25 February 2026] 

I excitedly shared the finding with my team, who began helping dig through the code with me to take it apart and understand it better. This amped me up, and I wanted to keep going.


At this point, I had a working POC on our client, and on version [REDACTED], but would this work across all versions? I checked the repository, and found that the latest version was [REDACTED], and I knew the one I was looking at wasn't up to date. This left a bit of a pit in my stomach, but I wasn't going to throw in the towel yet. So I went to Shodan. I began querying for [REDACTED], [REDACTED], and [REDACTED]. I found quite a few public facing assets running this technology of all different versions! I don't know why I was super surprised, as this project had [REDACTED] amount of GitHub stars. Using the passive internet-wide scan data, we confirmed that the affected code path existed across multiple released versions, including the most recent.

I just found a 0day.

After confirming it works on all versions, locally, and in just about most other edge cases, along with the vulnerable code, it was time to disclose it.

# Disclosure

I was quite impressed with how seamlessly this discovery to disclosure pipeline went. According to message timestamps, I posted this finding at 12:45 PM after I confirmed the payload to work on our customer. By 15:54, the vulnerability had already been written up and disclosed both to our customer and the vendor. It went pretty smoothly as [REDACTED] allows for GitHub Security Advisories to be opened. The POC was simple:

[Technical details intentionally withheld until 25 February 2026]

## 1. Reporting Channels

I anxiously awaited those next few days for a response. By day 2 it was still in the triage phase. I’ll admit I can be impatient, so I emailed them a few days later to their security email provided under their security tab on the GitHub organisation. I followed the steps, sent the POC and then had a colleague do a quick review before I sent it off. 

Crickets.

At that point, I realised the repository was barely maintained. I had bumped the thread a few times in the GHSA, sent an email to the Dutch Institute of Vulnerability Disclosure, and by 14 December, 2025 I reached out via [REDACTED] to [REDACTED] which appeared to be one of the maintainers. I received no response. By the 21st, I had mentioned another one of the maintainers, who also happened to be listed in the respository. 

No response to this day still.

To break down this timeline:

1. 27 November, 2025 12:45 - Bug was discovered
2. 27 November, 2025 15:54 - Bug was disclosed
3. 1 December, 2025  12:18 - Email with POC was sent to their security@ email.
4. 8 December, 2025  11:06 - Reached out to Dutch Institute of Vulnerability Disclosure
5. 14 December, 2025 18:18 - Reached out via social media platform to [REDACTED]
6. 18 December, 2025 [no time] - Bumped the GHSA thread
7. 21 December, 2025 12:27 - Reached out in same social media thread to [REDACTED]
8. 27 December, 2025 15:02 - Follow up email sent. Bumped the GHSA thread.

# Coordinated Disclosure

As you can see, I've had very little luck with reporting this bug to all the channels I know to be available. So I took matters into my own hands. Where appropriate, we attempted limited, good-faith notifications to operators of publicly exposed instances, based solely on passive identification and without interaction beyond initial contact. Unfortunately many of the vulnerable applications are in a country where being a Western security researcher is ill advised. I have heard horror stories both pertaining to security and also unrelated to security about this country, and there are consequences for fucking up otherwise. That's a game I'm just not willing to play, I'm not a gambling man because the house always wins. I narrowed the scope down to EU, US, and AU based targets. I reached out to educational institutions, security companies, and your run of the mill retail or ecommerce companies who happen to be hosting this software. 

I have also received no responses, but in all honesty, only the educational institution seemed promising because the websites were otherwise incredibly shady and looked rather unmaintained or abandoned. I'm hoping after the holiday season DIVD will follow up and help me coordiate disclosure to impacted entities. 

# Final Remarks

The sad truth about responsible disclosure, especially for open source projects is that the maintainers may not respond at all. I hope that individual is okay. I know my story isn't unique, and this isn't me trying to blast anyone, I'm just really excited about a cool, novel bug I found. I'm bursting at the seams with excitement and I just want to share my research with the world. I have a lot of thoughts around the current responsible disclosure process and some of the pitfalls it has, which is another blog post in the making, but I wanted to give a very special shoutout to my sick team at Hadrian, and send a lot of love to the other researchers who bust their ass day and night even if their work, progress and research goes unappreciated, unseen, and unfunded. I hope to bring positive updates soon, but there will be an update by 25 February, 2026 regardless. 


### Resources:
- [Link To White Paper On Vulnerability Class Here]
- [Shoutout to the security researcher who's payload I used]
- [Hopefully a link to either my CVE/GHSA]