# SECURITY — BrandlyFrames Security Baseline

> Applies to every package in the BrandlyFrames monorepo, all CI workflows,
> and all templates. Sources: GOAL_00 §8 (security + telemetry lines), DPF
> workspace security baseline (§9, §7.4), and feature ids BF-423, BF-428,
> BF-430, BF-475.
>
> Security by default — these are prerequisites, not options.

## 1. Secrets policy

- **Never commit `.env` files.** `.env` (and `.env.local`, `.env.development`,
  `.env.production`) are listed in `.gitignore` from repo init (BF-001);
  only `.env.example` is committed, documenting required vars.
- **No hardcoded secrets, API keys, or credentials in code** — source, tests,
  fixtures, docs, templates, or tool config files.
- Provider credentials (AI providers, cloud vendors) stay inside approved
  tooling; they are never copied into scripts or tool config files.
- CI and pre-commit checks scan for accidentally committed secrets; a leaked
  secret is rotated immediately, never just deleted.

## 2. Sandbox file access to project root

- `staticFile()` and the renderer resolve asset paths strictly inside the
  resolved **project root** (GOAL_00 §8: "sandbox file access to project
  root"). Path traversal (`../`) and absolute paths escaping the root are
  rejected with a clear, named error.
- Render workers (headless Chrome tabs, FFmpeg processes) receive only the
  explicit paths they need — project assets plus managed cache directories
  (e.g. the FrameStore cache). They never get ambient filesystem access.
- Templates and docs must never demonstrate patterns that widen file access.

## 3. Remote asset URL validation

- All remote loads (`<Img>`, `<Video>`, `<Audio>`, `<FrameVideo>`,
  `extractFrames`, prefetch) validate remote asset URLs before fetch
  (GOAL_00 §8). Scheme must be `https` (plain `http` only behind an explicit
  project opt-in); project config may restrict allowed hosts.
- **Remote asset cache** (BF-428, v0.3): checksum verification, retry,
  prefetch and offline mode for URL assets so flaky links don't break
  renders.
- Failed loads never render a blank frame: the frame is held, then fails
  naming the exact asset and component (BF-423).

## 4. No arbitrary code execution from props

- Composition props are **data**. Every composition registers a Zod schema;
  props (including `inputProps`) are validated against it before use.
- The SDK never `eval`s, `new Function`s, or dynamically imports strings that
  originate from props, input-props files, or network data (GOAL_00 §8).
- Code that executes — `calculateMetadata`, `brandlyframes.config.ts` — is
  developer-authored project code loaded from the project itself, never from
  props.
- **Safe multi-tenant rendering** (BF-475, v0.7) for SaaS apps that render
  user-supplied props: prop validation, resource and time limits, sandboxed
  network, per-tenant quotas.

## 5. Telemetry opt-in only

- **Telemetry: none by default (opt-in only)** — GOAL_00 §8.
- No analytics, crash reporting, or phone-home calls in any package, CLI
  command, or template; rendering and Studio work fully offline.
- Any future telemetry must be explicit opt-in (never opt-out), documented in
  the privacy notes, and disabled in CI and non-interactive contexts.

## 6. CI secret handling

- Secrets in CI are **GitHub Secrets — never variables** (repository or
  environment variables are not secret storage).
- `pull_request` workflows from forks never receive secrets; publishing and
  cloud-deploy jobs read tokens only in trusted contexts.
- Never echo secrets into logs; mask anything secret-like in workflow output.
- The npm publish token is fine-grained and limited to the `@brandlyframes`
  scope; cloud adapters use least-privilege IAM roles (BF-470's `cloud
  deploy` provisions them automatically, never by hand-pasting keys).

## 7. pnpm audit policy

- Run `pnpm audit` regularly across the workspace; it is part of the
  pre-release review checklist (DPF workspace baseline).
- CI blocks on **high** and **critical** advisories in production
  dependencies; an exception requires a documented justification with an
  owner and a removal plan.
- No known-vulnerable transitive dependency ships in a tagged release
  without an accepted-risk note in the release checklist.

## 8. Dependency pinning

- `pnpm-lock.yaml` is committed; CI installs with `--frozen-lockfile`.
- **Managed Chromium and FFmpeg are pinned** to exact versions and
  auto-downloaded by the toolchain (BF-430, v0.3); `brandlyframes doctor`
  reports version drift.
- Docker / devcontainer base images are pinned (e.g. `node:24-alpine`), never
  `:latest`.
- Studio/Player WebCodecs behavior is tested against the same managed
  Chromium version the renderer uses, so capture results stay reproducible.

## 9. Disclosure and release gate

- Security issues are reported privately (GitHub Security Advisories), not
  as public issues.
- Every release path includes a **security review** step (BF-092, v1.0) and
  the release verification gate (code ↔ git ↔ registry versions match).
