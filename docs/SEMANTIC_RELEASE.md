# Semantic Release Setup

This document explains the semantic release configuration for automated versioning and changelog generation.

## 📦 Overview

We use [semantic-release](https://semantic-release.gitbook.io/) to automate the release process based on conventional commits.

## 🔧 Configuration

### Release Configuration (.releaserc.json)

The release process is configured in `.releaserc.json` with the following plugins:

#### 1. Commit Analyzer
Analyzes commits to determine the next version:
- `feat:` → Minor version (0.x.0)
- `fix:` → Patch version (0.0.x)
- `BREAKING CHANGE:` → Major version (x.0.0)

#### 2. Release Notes Generator
Generates release notes from commit messages with categorized sections:
- 🚀 Features
- 🐛 Bug Fixes
- ⚡ Performance Improvements
- ♻️ Code Refactoring
- 📚 Documentation
- 📦 Build System

#### 3. Changelog
Automatically updates `CHANGELOG.md` with release notes.

#### 4. GitLab Integration
Creates GitLab releases with:
- Release notes
- Distribution files (dist/)
- Changelog

#### 5. Git Plugin
Commits version bump and changelog back to the repository:
```
chore(release): 1.2.3 [skip ci]
```

## 🌿 Branch Configuration

### Production Releases
- **main/master**: Standard releases (1.0.0)
- **prod**: Production channel releases

### Pre-releases
- **beta**: Beta releases (1.0.0-beta.1)
- **alpha**: Alpha releases (1.0.0-alpha.1)

## 🚀 Release Workflow

### Automatic Releases (CI/CD)

When commits are pushed to `main`, `master`, or `prod`:

1. **Build Phase**
   - TypeScript compilation
   - Artifacts created

2. **Release Phase**
   - Analyzes commits since last release
   - Determines next version
   - Generates changelog
   - Creates Git tag
   - Creates GitLab release
   - Commits version bump

### Manual Testing

Test the release process without publishing:

```bash
# Dry run - see what would be released
npm run release:dry

# Local release (not recommended for production)
npm run release
```

## 📋 Version Determination

### Patch Release (0.0.x)
Triggered by:
- `fix:` commits
- `perf:` commits
- `revert:` commits

Example:
```bash
fix: resolve parser timeout issue
```
Result: `1.0.0` → `1.0.1`

### Minor Release (0.x.0)
Triggered by:
- `feat:` commits

Example:
```bash
feat: add inline comment support
```
Result: `1.0.0` → `1.1.0`

### Major Release (x.0.0)
Triggered by:
- `BREAKING CHANGE:` footer
- `feat!:` or `fix!:` with breaking change

Example:
```bash
feat!: migrate to TypeScript

BREAKING CHANGE: Source files are now TypeScript
```
Result: `1.0.0` → `2.0.0`

## 🔐 Environment Variables

Required for GitLab releases:
- `GITLAB_TOKEN` or `GL_TOKEN`: GitLab personal access token
- `CI_JOB_TOKEN`: GitLab CI job token (automatic in pipelines)

## 📝 Commit Types That Don't Trigger Releases

These commit types are included in the changelog but don't trigger a release:
- `docs:` - Documentation updates
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test updates
- `build:` - Build system changes
- `ci:` - CI/CD changes
- `chore:` - Maintenance tasks

## 🎯 Best Practices

### 1. Write Clear Commit Messages
```bash
# Good
feat(api): add pagination support for comments
fix(parser): handle empty markdown sections

# Bad
feat: stuff
fix: bug
```

### 2. Group Related Changes
Make one commit per logical change.

### 3. Document Breaking Changes
Always include `BREAKING CHANGE:` footer with explanation:
```bash
feat!: remove legacy API endpoints

BREAKING CHANGE: Endpoints /v1/* have been removed.
Use /v2/* endpoints instead. Migration guide: docs/migration.md
```

### 4. Use Scopes
Add scope for better changelog organization:
```bash
feat(api): add endpoint
feat(ui): add button
fix(parser): resolve issue
```

## 🔍 Troubleshooting

### Release Not Triggered

1. **Check commit format**: Must follow conventional commits
2. **Check branch**: Only main/master/prod trigger releases
3. **Check last release**: No new commits since last release
4. **Check CI logs**: Look for semantic-release errors

### Version Not Updated

1. **Check commit type**: Only `feat`, `fix`, and `BREAKING CHANGE` trigger releases
2. **Check GitLab token**: Ensure `GITLAB_TOKEN` is set
3. **Check permissions**: Token needs push access to repository

### Changelog Not Generated

1. **Check plugin configuration**: Ensure `@semantic-release/changelog` is installed
2. **Check commit messages**: Must follow conventional format
3. **Check file permissions**: Ensure CHANGELOG.md is writable

## 📚 Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Release Documentation](https://semantic-release.gitbook.io/)
- [GitLab Integration](https://github.com/semantic-release/gitlab)
- [Commit Analyzer Rules](https://github.com/semantic-release/commit-analyzer)

## 🎉 Example Release Flow

```bash
# 1. Feature branch workflow
git checkout -b feat/add-pagination
# ... make changes ...
git add .
git commit -m "feat(api): add pagination support for comments"
git push origin feat/add-pagination

# 2. Create merge request
# 3. Merge to main (via GitLab UI)

# 4. Semantic release (automatic in CI)
# - Analyzes commits: finds "feat:" commit
# - Determines version: 1.0.0 → 1.1.0
# - Generates changelog
# - Creates tag: v1.1.0
# - Creates GitLab release
# - Commits version bump

# 5. Result
# - package.json: version 1.1.0
# - CHANGELOG.md: updated with new feature
# - Git tag: v1.1.0
# - GitLab release: created with notes
```

## 🚦 Release Checklist

Before merging to main:
- [ ] All commits follow conventional format
- [ ] Breaking changes are documented
- [ ] Tests pass (when implemented)
- [ ] TypeScript compiles without errors
- [ ] Documentation is updated
- [ ] GITLAB_TOKEN is configured in CI/CD variables

---

For more information, see [CONTRIBUTING.md](../CONTRIBUTING.md)

