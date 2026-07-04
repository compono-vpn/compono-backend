## UPSTREAM.md — compono-backend fork maintenance (BDT-401)

This repo is a fork of [remnawave/backend](https://github.com/remnawave/backend)
("Remnawave Panel Backend"), rebranded and extended for Compono VPN. This
document is the single source of truth for what has diverged from upstream,
why, and how to bring the fork forward onto a newer upstream release.

### Fork basis

- Upstream repo: `https://github.com/remnawave/backend.git`
- Base tag: **`2.6.1`**
- Base commit: **`f4fbccec24fe82a00148c05b95351d5cb0694a0c`** ("chore: release v2.6.1", 2026-02-16)
- This is the exact merge-base between this repo's `main` and both
  `upstream/main` and `upstream/dev` — i.e. every commit on `main` after this
  point is Compono-specific. `package.json`'s `version` (`2.6.1`) has never
  been bumped past the base tag, so it does **not** reflect how far ahead of
  upstream this fork actually is — use the base commit above, not the version
  string, when comparing against a new upstream release.

### Add the `upstream` remote

Not part of the committed repo (`git remote` is local config, not a tracked
object), so run this once per clone:

```sh
git remote add upstream https://github.com/remnawave/backend.git
git fetch upstream --tags
git merge-base main upstream/dev   # should print f4fbccec24fe82a00148c05b95351d5cb0694a0c
                                    # until the next rebase — see below
```

### Every Compono divergence (34 commits ahead of `2.6.1`, oldest first)

#### Schema change — the one invasive patch

| Commit | Date | What |
|---|---|---|
| `9fef7d43`, `7006b0c9` | 2026-02-18/19 | **"N hops arch"** — adds 4 nullable override columns to the upstream-owned `hosts` table: `reality_pbk_override`, `reality_sid_override`, `flow_override`, `transport_override` (migration `prisma/migrations/20260218120000_add_reality_overrides`). Lets a per-host config override the Reality public key / short ID / flow / transport that would otherwise be derived from the node's inbound config — the underpinning for Compono's multi-hop relay architecture. |

Touches 7 files beyond the migration itself, all marked with
`// --- COMPONO FORK BEGIN (BDT-401, migration 20260218120000_add_reality_overrides) ---`
/ `// --- COMPONO FORK END ---` around the added lines so a rebase can find
and mechanically re-apply exactly this block after a conflict:

- `prisma/schema.prisma` — the 4 columns on `model Hosts`
- `libs/contract/commands/hosts/create.command.ts` — same 4 fields on the create DTO
- `libs/contract/commands/hosts/update.command.ts` — same 4 fields on the update DTO
- `libs/contract/models/hosts.schema.ts` — same 4 fields on the wire schema
- `src/modules/hosts/entities/hosts.entity.ts` — same 4 fields on the entity
- `src/modules/hosts/hosts.converter.ts` — entity → model mapping for the 4 fields
- `src/modules/hosts/models/host.response.model.ts` — same 4 fields on the API response model (field decl + constructor assignment, both marked)

One more file consumes these columns but is **not** comment-marked —
`src/modules/subscription-template/generators/format-hosts.service.ts` — because
the override values are threaded into existing expressions (e.g.
`inputHost.realityPbkOverride || publicKeyFromConfig || ''`) rather than
appended as a standalone block, and this file sits directly on the `/api/sub`
money path (subscription payload generation for every VPN client), so it was
judged not worth an edit-for-a-comment's-sake risk. After a rebase, `grep -n
'realityPbkOverride\|realitySidOverride\|flowOverride\|transportOverride'
src/modules/subscription-template/generators/format-hosts.service.ts` against
upstream's rewritten version of this file and manually re-thread the 4
overrides into the new control flow.

`hosts` is co-owned: compono-api hand-maintains its own SQL against the same
table (see "compono-api Schema Drift Guard" below) — any rename/retype of
these 4 columns (not just additions) needs a coordinated compono-api change.

#### Product / behavior commits

| Commit | Date | Why |
|---|---|---|
| `164837c5` | 2026-02-22 | `GET /api/users/active-vless-uuids` — returns every active VLESS UUID; used by relay-sync/monitoring tooling. Gated by the same `@Roles(ADMIN, API)` + `JwtDefaultGuard`/`RolesGuard` as the rest of `UsersController`. |
| `ecfecc23` | 2026-02-24 | Rebrand seed defaults from Remnawave → Compono VPN (cosmetic, low rebase risk). |
| `b1997966` | 2026-03-20 | First half of the proxy-check internal bypass: skip the reverse-proxy/HTTPS check in `ProxyCheckGuard` for `10.x` sources, so relay-sync can call the API directly without going through the public HTTPS ingress. |
| `f3d034d2` | 2026-03-22 | Return empty subscription links for expired/disabled/limited users instead of erroring — direct `/api/sub` behavior. |
| `585b2b54` | 2026-03-29 | Second half: the guard's bypass never actually ran because `proxyCheckMiddleware` (mounted globally in `main.ts`, before any guard) already destroys the socket first — so the same bypass was duplicated into the middleware. **This is the exact duplication BDT-403 addresses**: both copies are now `isTrustedInternalSource()` from `src/common/utils/network/is-trusted-internal-source.ts`, and the trusted range was tightened from all of `10.0.0.0/8` down to the cluster's actual pod CIDR `10.42.0.0/16` (see that file + its test for the full rationale — a live packet capture during that work confirmed the cluster's node-private network, `10.100.0.0/24`, was previously also being trusted purely because it happens to start with `10.`). |
| `fd43cc9f`, `1d031bc5` | 2026-04-23 | BDT-27: make node user-push failures visible instead of silently swallowing an undefined payload. |
| `b72c48dd` | 2026-04-24 | BDT-27: `GET /api/nodes/:uuid/expected-users` — panel-side expected user list per node, consumed by compono-relay-sync. |
| `b5db57dc` | 2026-04-24 | BDT-27: fix a raw Kysely aggregate query (`sql.ref()` for `configProfileInbounds.tag`). |
| `7a14358b` | 2026-04-27 | BDT-27: `POST /api/nodes/:uuid/reconcile-users` — convergent xray reconciliation (add missing / remove stale users per node, with a safety cap). Gated the same way as `active-vless-uuids` above. |
| `aaa6ef71` | 2026-04-28 | `.gitignore` `.env.*` and `.claude/` (repo hygiene, no runtime effect). |

#### Rebrand / registry commits (cosmetic, apply cleanly)

`cb335d01` (package rename `@remnawave/backend` → `@compono/backend`),
`7203ef3d` (GHCR registry `bdtfs` → `compono-vpn`), `87b0abe1` (chore: trigger
build).

#### CI/CD-only commits (18 commits, Compono-specific pipeline — expect to redo from scratch on every rebase, not merge)

`c3eef827`, `5f94d521`, `40553411`, `5ae21e65`, `b4c94bac`, `e0e6a9c7`,
`7a31fc71`, `8ec83098`, `f0600229`, `4fd57b7c`, `0496ed78`, `a77d9e22`,
`d572e613`, `4bfc0f33`, `00b19608`, `546c6d5e`, `24362ae1`, `00470107` — all
`.github/workflows/` churn (self-hosted vs GH-hosted runners, multi-arch vs
single-arch, ArgoCD dispatch, BuildKit DNS retries). None of this touches
application code; upstream's own CI setup is irrelevant to Compono's deploy
pipeline, so on rebase just keep this fork's current `build-and-push.yml`
as-is (it already includes the BDT-398 typecheck/lint/test gates and the
BDT-403 test invocation) rather than trying to merge upstream's workflow
changes into it.

### How to rebase onto a new upstream release

1. `git fetch upstream --tags` and pick the target tag (check
   `https://github.com/remnawave/backend/releases` for breaking changes first,
   especially to `prisma/schema.prisma`, the `hosts` module, and
   `src/main.ts`/proxy-check).
2. From a throwaway worktree (never rebase in the shared checkout — same rule
   as `argocd-apps`), rebase `main` onto the target tag:
   ```sh
   git worktree add /tmp/compono-backend-rebase origin/main
   cd /tmp/compono-backend-rebase
   git rebase --onto <new-upstream-tag> f4fbccec24fe82a00148c05b95351d5cb0694a0c main
   ```
3. Resolve conflicts commit-by-commit in the order listed above. The DDL
   commits (`9fef7d43`, `7006b0c9`) are the most likely to conflict — use the
   `COMPONO FORK BEGIN/END` markers to find every touch point and re-apply
   the 4 columns; then manually re-thread the `format-hosts.service.ts` logic
   (see above).
4. Skip re-applying the CI-only commits; instead diff whether upstream's own
   `.github/workflows/` changed anything Compono's `build-and-push.yml` should
   pick up (e.g. a new required build arg), and port only that, by hand.
5. Regenerate: `npm run migrate:generate`, `npx prisma validate`, `npx tsc
   --noEmit`, `npm run lint`, then both `*.test.ts` files (see below).
6. Update this file's "Fork basis" section with the new base tag/SHA
   (`git merge-base main upstream/dev` after the rebase) and prepend any new
   divergent commits to the tables above.

### What must be re-verified after a rebase

- [ ] `npx tsc --noEmit -p tsconfig.json`, `npm run lint`, and both
      `src/modules/nodes/utils/reconcile-diff.test.ts` and
      `src/common/utils/network/is-trusted-internal-source.test.ts` pass
      (CI runs these as required gates per BDT-398/BDT-403).
- [ ] `/api/sub/*` still serves a valid subscription for a real user on stage
      before touching prod (this is the money path — 7 domains' worth of
      live VPN client subscription delivery all point at this service).
- [ ] The 4 `hosts` override columns still round-trip: create/update a host
      with `realityPbkOverride`/`realitySidOverride`/`flowOverride`/`transportOverride`
      set, confirm `format-hosts.service.ts` still applies them to the
      generated subscription.
- [ ] `active-vless-uuids` and `reconcile-users` are still only reachable with
      a valid `@Roles(ADMIN, API)` JWT (unauthenticated/wrong-role request
      gets 401/403, not 200) — this authorization is independent of the
      proxy-check internal-source bypass and must stay that way.
- [ ] `proxyCheckMiddleware`/`ProxyCheckGuard` still both delegate to
      `isTrustedInternalSource()` — don't let a rebase reintroduce an inline
      `startsWith('10.')` check in either file.
- [ ] **compono-api's Schema Drift Guard.** `compono-api`'s
      `.github/workflows/schema-drift.yml` sparse-checks out this repo's
      `main` branch (specifically `prisma/schema.prisma`, via a plain
      `actions/checkout` of `compono-vpn/compono-backend@main` — public repo,
      no token needed) on every push/PR to compono-api plus a daily cron, and
      runs `cmd/schemadrift-check` to structurally diff the live schema
      against a committed lockfile (`schema-drift/expected_schema.json`) for
      31 tracked tables including `hosts` and `hosts_to_nodes`. It fails the
      build if a tracked column is removed, renamed, or retyped. It does
      **not** fail on additions, and it's structural-only (names + types) —
      it won't catch a positional `Scan()`-order mismatch in compono-api's
      hand-written SQL. **Practically:** if a rebase changes the shape of any
      column this fork already added or that compono-api reads (not just the
      4 override columns — check `tables.txt` in compono-api for the full
      tracked list), coordinate the compono-api change and lockfile
      regeneration (`-generate` mode of the same CLI) in the same window,
      don't just merge this repo and let the daily cron discover it later.

### Known follow-ups (not implemented in this pass — flagged for a future issue)

- The `isTrustedInternalSource()` tightening (BDT-403) narrows the trusted
  range from all of `10.0.0.0/8` to the cluster's pod CIDR
  (`10.42.0.0/16`, configurable via `TRUSTED_INTERNAL_CIDRS`), but a
  live capture during that work showed that **any** in-cluster pod reaching
  compono-backend's `ClusterIP` Service — not just legitimate callers — gets
  SNAT'd by kube-proxy into that same pod CIDR, so the remaining gap ("any
  pod in the cluster, not just Compono's own services, can reach this IP
  range") can only be closed with a `NetworkPolicy` restricting which
  namespaces/pods may reach `compono-backend` at all. That's an
  `argocd-apps` change, out of this repo's scope — worth its own ticket.
