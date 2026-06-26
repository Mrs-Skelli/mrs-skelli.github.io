---
title: "When Open Repos Hand You the Keys: Hardcoded Docker Credentials in a Public Helm Chart"
date: 2026-06-05
draft: false
description: "How a misconfigured Nexus repo and committed Helm secret exposed 50+ private Docker image repositories."
summary: "A routine glance at an exposed Nexus instance led to unauthenticated access to 50+ private production Docker repositories."
technologies: ["kubernetes", "helm", "nexus", "docker"]
vulnerabilities: ["credential-exposure", "misconfiguration"]
---

# When Open Repos Hand You the Keys: Hardcoded Docker Credentials in a Public Helm Chart

---

## Preface

Some findings arrive after days of fuzzing, creative chaining, and stubborn persistence. Others just... walk up and introduce themselves. This was the latter. What started as a routine glance at an exposed Nexus instance turned into a critical unauthenticated access to 50+ private production Docker image repositories for a SaaS infrastructure provider, with no credentials required at any step until the very end, at which point the credentials were already in my hand.

This is the story of how a single misconfigured repository setting and a committed secret turned into a full supply-chain risk against a production Kubernetes environment.

---

## Discovery

During a routine recon pass, I identified a publicly accessible Sonatype Nexus Repository Manager instance. Nexus is a popular artefact and package registry used to host Helm charts, Docker images, Maven packages, and more. Plenty of legitimate reasons to run one. Far fewer reasons to leave it open to the internet without authentication.

A quick probe confirmed that anonymous access was enabled on the instance and that three repositories were browsable without any credentials:

- `axr-helm`
- `xbe-helm`
- `public`

```bash
curl -sk "https://[REDACTED]/service/rest/v1/repositories"

```

The response returned all three repositories in a clean JSON listing. No 401. No redirect. Just data.

---

## Pulling the Chart

Both `axr-helm` and `xbe-helm` appeared to host production Helm charts for the platform's services. Helm charts are essentially templated Kubernetes manifests, and they describe how to deploy applications, configure services, set environment variables, and, critically, handle secrets.

I downloaded the latest Helm chart archive from the `xbe-helm` repository anonymously:

```bash
curl -sk "https://[REDACTED]/repository/xbe-helm/[CHART].tgz" -o chart.tgz
tar -xzf chart.tgz

```

No authentication. No challenge. Just a 200 and a 600KB tarball.

---

## The Finding

Once extracted, I began reviewing the chart templates. Helm charts follow a predictable directory structure, so it didn't take long to find the interesting stuff. Inside `templates/0_config/` sat a file defining a Kubernetes secret of type `kubernetes.io/dockerconfigjson` which was a Docker pull secret used to authenticate against a private container registry.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: redacted-docker-creds
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: [REDACTED SECRET]

```

The value was hardcoded. Not templated from a secrets manager. Not referenced from a Vault path. Just a static base64 string sitting in a file that anyone could download.

Decoding it was trivial:

```bash
echo "[BASE64_VALUE]" | base64 -d

```

Output:

```json
{
  "auths": {
    "docker.[REDACTED]": {
      "username": "[REDACTED]",
      "password": "[REDACTED]",
      "auth": "[REDACTED]"
    }
  }
}

```

Plaintext username and password for a Docker registry. In a public Helm chart.

---

## Verification

At this point I had credentials, but credentials are worthless until you verify them. I hit the Docker registry's v2 catalog endpoint:

```bash
curl -u "k8s_core:[REDACTED]" "https://docker.[REDACTED]/v2/_catalog"

```

HTTP 200.

The response returned a full listing of **50+ private repositories** for the production microservice images across the platform's entire backend: account, economy, session, matchmaking, scripting, purchasing, and more. Every single one accessible with read permissions using the credentials I'd just pulled out of a public Helm chart.

---

## Bonus: Infrastructure Recon

While reviewing the chart further, I found shell scripts embedded in the archive that referenced internal developer paths. Which contained a production kubeconfig file path and an internal Kubernetes infrastructure repository path. Neither of these granted direct access, but they provide meaningful reconnaissance value: you now know where production credentials live on a developer's machine and where the infrastructure-as-code lives internally.

These kinds of artefacts don't get flagged by automated scanners. They're easy to miss in code review. And they're exactly the kind of thing an attacker chains together with other findings.

---

## The Chain

Laid out cleanly, the attack path was:

```
Anonymous Nexus access
        ↓
Download production Helm chart (no auth)
        ↓
Extract hardcoded Docker registry credentials
        ↓
Authenticate to private Docker registry
        ↓
Read access to 50+ production microservice images
        ↓
Pull images → extract secrets, configs, and internal logic
        ↓ (if k8s_core has write perms)
Push malicious image → supply chain compromise

```

Every step until the Docker registry itself required zero credentials. And the credentials for the registry were already in the chart.

---

## Impact

The immediate impact is full read access to all private production container images. That alone is significant as production images routinely contain hardcoded API keys, internal service endpoints, database connection strings, and logic that was never designed to be publicly visible.

Beyond that, if the service account holds write permissions on the registry (which I did not test, to avoid any risk of actual harm), a threat actor could push a malicious image under an existing tag. When the cluster next pulls that image for a deployment, it would execute attacker-controlled code inside the production Kubernetes environment. That's a supply chain compromise with direct production impact.

The shell scripts provide supplementary recon value, confirming internal developer usernames, machine paths, and infrastructure repository structure, which reduces the effort required for targeted follow-on attacks.

---

## Remediation

**Immediate:**

- Rotate the `[REDACTED]` credentials and treat them as fully compromised.
- Disable anonymous access on the Nexus instance (Security → Anonymous Access → uncheck "Allow anonymous users to access the server").

**Short-term:**

- Audit all Helm chart versions in both repositories for other embedded secrets, tokens, or credentials. Assume anything committed is compromised.
- Remove static `.dockerconfigjson` defaults from chart templates entirely. Docker pull secrets must be injected at deploy time via a secrets manager — HashiCorp Vault, Sealed Secrets, or External Secrets Operator are all solid choices.
- Review the service account's permissions on the registry and scope them to the minimum required.

**Long-term:**

- Implement pre-commit hooks and CI checks using tools like `trufflehog`, `gitleaks`, or `detect-secrets` to catch credentials before they land in artefact repositories.
- Treat Helm charts as code. They go through the same secret scanning pipeline as application source.
- Alternatively you can just buy Hadrian EASM ;) We detect these kinds of bugs.

---

## Takeaways

This finding is a good reminder that the hardest part of some bugs isn't finding them, it's that nobody thought to look. Nexus instances are often internal tooling that gets stood up, configured once, and forgotten. Anonymous access is enabled by default in older versions and sometimes left on intentionally for convenience during development, then never revisited.

Helm charts are also an underappreciated attack surface. They live in artefact registries rather than source control, which means they often bypass the secret scanning tooling that's been wired up for Git. The credentials in this chart had presumably been sitting there across multiple releases, freely downloadable by anyone who knew where to point a curl command.

The lesson for defenders: your artefact registry is part of your attack surface. Scan it accordingly.