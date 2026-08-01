## [1.0.1](https://github.com/TakahashiNguyen/typeorm-d1/compare/v1.0.0...v1.0.1) (2026-08-01)


### Bug Fixes

* handle npm pack output with build logs ([f60b838](https://github.com/TakahashiNguyen/typeorm-d1/commit/f60b838840dc739e6f733a640d76a0e75498a2c6))
* improve JSON parsing in verify-package script ([#2](https://github.com/TakahashiNguyen/typeorm-d1/issues/2)) ([dc42b3f](https://github.com/TakahashiNguyen/typeorm-d1/commit/dc42b3f8b59c2a917fd32eed31374ab3abf1f0d4))
* trigger package.json fix ([4b2bdd7](https://github.com/TakahashiNguyen/typeorm-d1/commit/4b2bdd7faf6faaf2c9b54e5d27f0b1c1e5e5c879))

# 1.0.0 (2026-07-30)


### Bug Fixes

* add semantic release ([#1](https://github.com/TakahashiNguyen/typeorm-d1/issues/1)) ([ec05456](https://github.com/TakahashiNguyen/typeorm-d1/commit/ec054569f370c0fe39e4e0ec1db165baad33929e))
* **release:** configure repositoryUrl in .releaserc ([9648397](https://github.com/TakahashiNguyen/typeorm-d1/commit/964839784d289ce83199b420d40f9c6e74e4d868))
* trigger release ([2264c5e](https://github.com/TakahashiNguyen/typeorm-d1/commit/2264c5ef1ce7c4f578b165140078685528ade1b8))

# Changelog

## Unreleased

- Add dual CommonJS/ESM package output with a strict package export map.
- Add package verification for CJS import, ESM import, built DataSource smoke,
  and npm tarball contents.
- Add explicit D1 atomic batch APIs: `executeD1Batch()` and
  `D1QueryRunner.executeBatch()`.
- Clarify that TypeORM transaction methods are compatibility shims and rollback
  does not undo writes.
- Add TypeORM query logging and query broadcaster support.
- Add real SQLite/D1 view introspection.
- Update tests to Miniflare 4 D1 APIs.
- Remove checked-in coverage, generated test declarations, and debug scripts.
- Rewrite README, ISSUES, and test documentation for public use.
- Add AGENTS, CONTRIBUTING, SECURITY, and LICENSE documents.
