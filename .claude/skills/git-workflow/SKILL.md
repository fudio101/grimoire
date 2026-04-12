---
name: git-workflow
description: "ALWAYS use this skill when creating git branches, writing commit messages, committing code, or performing any git commit/branch operation. This includes when the user says 'commit', 'create a branch', 'push changes', 'make a PR', '/commit', or any variation. Enforces Conventional Commits v1.0.0 and project branch naming conventions for Release Please automation."
---

# Git Workflow

This skill governs all git branch creation and commit message formatting. The project uses GitHub Flow with Conventional Commits v1.0.0 and Release Please for automated versioning. Every commit message on `main` directly controls version bumps and changelog generation — precision matters.

## Why This Matters

This project uses **squash merging** — the PR title becomes the single commit on `main`. Release Please reads these messages to:
- Decide whether to bump MAJOR, MINOR, or PATCH version
- Generate the CHANGELOG automatically
- Create release PRs with correct version numbers

A malformed commit message means Release Please **ignores the change entirely**. A wrong type means a wrong version bump. This is not cosmetic — it is functional.

## Branch Creation

### Naming Format

```
<prefix>/<kebab-case-description>
```

### Prefixes

| Prefix      | When to use                                        |
|-------------|---------------------------------------------------|
| `feature/`  | New functionality or capability                    |
| `fix/`      | Bug fix                                            |
| `chore/`    | Maintenance, deps, config (no user-facing change)  |
| `ci/`       | CI/CD pipeline changes                             |
| `docs/`     | Documentation only                                 |
| `refactor/` | Code restructuring without behavior change         |
| `perf/`     | Performance improvement                            |

### Rules
- Use 2-4 words in kebab-case for the description
- Keep it concise but descriptive enough to identify the work
- Always branch from `main`

### Real Examples from This Repo
- `feature/loading-states`
- `fix/select-dropdown-in-modal`
- `chore/optimize-docker-cache`
- `ci/preserve-nextjs-cache`
- `fix/update-shadcn-security`

### Steps

1. Determine the work type and select the matching prefix
2. Summarize the work in 2-4 kebab-case words
3. Run:
```bash
git checkout main && git pull origin main && git checkout -b <prefix>/<description>
```

If the user is already on a non-main branch, ask whether to continue on the current branch or create a new one. Never silently stay on an existing branch when asked to "create a branch."

## Commit Messages

### Format (Conventional Commits v1.0.0)

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

### Types and Version Impact

| Type       | Version Bump | In CHANGELOG         | Use when                              |
|------------|-------------|----------------------|---------------------------------------|
| `feat`     | MINOR       | Features             | Adding new user-facing functionality  |
| `fix`      | PATCH       | Bug Fixes            | Fixing a bug                          |
| `perf`     | PATCH       | Performance          | Measurable performance improvement    |
| `docs`     | None        | Documentation        | Documentation changes only            |
| `refactor` | None        | Refactors            | Code change that is not feat or fix   |
| `chore`    | None        | **Hidden**           | Maintenance, deps, tooling            |
| `style`    | None        | **Hidden**           | Formatting, whitespace, linting       |
| `test`     | None        | **Hidden**           | Adding or fixing tests                |
| `ci`       | None        | **Hidden**           | CI/CD changes                         |
| `build`    | None        | **Hidden**           | Build system changes                  |

Only `feat` and `fix` (and `perf`) trigger version bumps. Choose type based on what the change **does**, not what files it touches.

### Description Rules
- Start with a lowercase letter
- Use imperative mood: "add" not "added" or "adds" — read it as "This commit will ___"
- Do not end with a period
- Keep under 72 characters total (including type + scope + colon + space)
- Be specific: "add loading skeleton to dashboard" not "update UI"

### Scope (Optional)
A noun in parentheses identifying the section of the codebase:
```
feat(auth): add session timeout handling
fix(transactions): correct VND formatting for large amounts
chore(deps): bump drizzle-orm to 0.35
```
Use scope when the change is clearly localized to one area. Omit when it spans multiple areas.

### Body (Optional)
For changes needing more explanation. Separate from description with a blank line. Wrap at 72 characters. Explain **what** and **why**, not how.

### Breaking Changes
Breaking changes trigger a MAJOR version bump. Signal them in one of two ways:

**Option 1 — Exclamation mark:**
```
feat!: replace authentication with OAuth2
```

**Option 2 — Footer (for detailed explanation):**
```
feat: replace authentication with OAuth2

BREAKING CHANGE: JWT cookie-based auth removed. All clients must now
authenticate via OAuth2 flow.
```

Always confirm with the user before marking something as breaking.

## Step-by-Step Commit Flow

1. **Stage specific files** — never use `git add .` or `git add -A`:
   ```bash
   git add src/path/to/file.ts src/path/to/other.ts
   ```

2. **Analyze the staged diff** to determine type:
   ```bash
   git diff --cached --stat
   git diff --cached
   ```

3. **Determine type** by asking:
   - New user-facing functionality? -> `feat`
   - Fixes a bug? -> `fix`
   - Performance improvement? -> `perf`
   - Code restructure, no behavior change? -> `refactor`
   - Only docs/comments? -> `docs`
   - CI/CD work? -> `ci`
   - Deps, config, tooling? -> `chore`

4. **Determine scope** from which directory or module the changes concentrate in

5. **Write the description** in imperative mood

6. **Commit** using a heredoc:
   ```bash
   git commit -m "$(cat <<'EOF'
   feat(dashboard): add monthly expense chart

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```

## Safety Rules

- **Always create new commits.** Never amend unless the user explicitly asks.
- If a pre-commit hook fails, the commit did NOT happen. Do NOT use `--amend` afterward — that would modify the **previous** (unrelated) commit. Fix the issue and create a new commit.
- Never use `--no-verify` to skip hooks unless the user explicitly requests it.
- Never force-push unless the user explicitly requests it.

## PR Titles

Since squash merging makes the PR title the commit on `main`, apply the same Conventional Commits format:
```
feat: add monthly expense chart to dashboard
fix: correct currency formatting for values over 1 billion VND
```

## Real Examples from This Project

```
feat: add loading UI for actions and dashboard routes
fix: remove unused Button import from dashboard layout
fix: update shadcn to 4.1.2 to resolve path-to-regexp vulnerability
chore: preserve Next.js build cache between CI runs
docs: update README with current tech stack and features
refactor: responsive month range picker and filter URL optimization
ci: add manual trigger for release-please
feat: mobile UX improvements and CI/CD pipeline overhaul
chore: use project-specific local cache for CI and Docker workflows
```

## Quick Reference

```
Branch:  <prefix>/<2-4-word-kebab-description>
         Prefixes: feature/ fix/ chore/ ci/ docs/ refactor/ perf/

Commit:  <type>(<scope>): <lowercase imperative description, no period, <72 chars>
         Version bump: feat=MINOR, fix/perf=PATCH
         Hidden from changelog: chore, style, test, ci, build
         Breaking: add ! before colon OR BREAKING CHANGE: footer
```
