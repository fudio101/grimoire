# Changelog

## [1.9.1](https://github.com/fugo101/grimoire/compare/v1.9.0...v1.9.1) (2026-07-08)


### 🐛 Bug Fixes

* **deps:** force patched postcss and esbuild via pnpm overrides ([#66](https://github.com/fugo101/grimoire/issues/66)) ([2984c6c](https://github.com/fugo101/grimoire/commit/2984c6c445f853c1d6123062028c47c7cb89bdaa))
* **docker:** stop copying removed .npmrc in deps stage ([#64](https://github.com/fugo101/grimoire/issues/64)) ([8d41f3c](https://github.com/fugo101/grimoire/commit/8d41f3ce9b28e502b5408d6875c32ae91b463ad0))

## [1.9.0](https://github.com/fugo101/grimoire/compare/v1.8.0...v1.9.0) (2026-07-08)


### 🚀 Features

* **deps:** bump pnpm version ([#60](https://github.com/fugo101/grimoire/issues/60)) ([95d579b](https://github.com/fugo101/grimoire/commit/95d579b9d30f0ac0f0f6d97d8024036521e8ea62))

## [1.8.0](https://github.com/fugo101/grimoire/compare/v1.7.0...v1.8.0) (2026-06-01)


### 🚀 Features

* show category parent path in public shared report ([#58](https://github.com/fugo101/grimoire/issues/58)) ([c9042fb](https://github.com/fugo101/grimoire/commit/c9042fb6fa5cc009d3981d88e50a84305265ec32))

## [1.7.0](https://github.com/fugo101/grimoire/compare/v1.6.1...v1.7.0) (2026-06-01)


### 🚀 Features

* show category parent path, default chart to weekly, allow uppercase link codes ([#56](https://github.com/fugo101/grimoire/issues/56)) ([42dec12](https://github.com/fugo101/grimoire/commit/42dec123cbf1ae1781a8aa58827c98c3dc893562))

## [1.6.1](https://github.com/fugo101/grimoire/compare/v1.6.0...v1.6.1) (2026-06-01)


### 🐛 Bug Fixes

* include drizzle migrations in Docker build context ([#54](https://github.com/fugo101/grimoire/issues/54)) ([91a920a](https://github.com/fugo101/grimoire/commit/91a920ae79842d1584988f826c66930d031f6773))

## [1.6.0](https://github.com/fugo101/grimoire/compare/v1.5.0...v1.6.0) (2026-06-01)


### 🚀 Features

* add nested category hierarchy with automatic DB migrations ([#51](https://github.com/fugo101/grimoire/issues/51)) ([09a6ff1](https://github.com/fugo101/grimoire/commit/09a6ff15d3b25e94667d8c4e65af998a96bf6b56))
* **share-links:** support multi-category public share links ([#52](https://github.com/fugo101/grimoire/issues/52)) ([9ee7c3e](https://github.com/fugo101/grimoire/commit/9ee7c3e3bb3e290b7ffe603c3899b4e34fd003e8))


### 🐛 Bug Fixes

* prevent share link actions overlapping info on mobile ([#53](https://github.com/fugo101/grimoire/issues/53)) ([44f0b75](https://github.com/fugo101/grimoire/commit/44f0b7592e7c71f5e334babd05d4908c25d736d0))


### 📚 Documentation

* clarify proxy middleware, CI, and date handling in CLAUDE.md ([#49](https://github.com/fugo101/grimoire/issues/49)) ([48e7557](https://github.com/fugo101/grimoire/commit/48e7557daa4c98e3fa7e3737fb8a5a9ca1b22b9e))

## [1.5.0](https://github.com/fugo101/grimoire/compare/v1.4.1...v1.5.0) (2026-04-12)


### 🚀 Features

* **transactions:** add expense bar chart with time granularity ([#41](https://github.com/fugo101/grimoire/issues/41)) ([0d83765](https://github.com/fugo101/grimoire/commit/0d837653a76af61a8aa51b8d75bd876f47f160f7))

## [1.4.1](https://github.com/fugo101/grimoire/compare/v1.4.0...v1.4.1) (2026-04-04)


### 🐛 Bug Fixes

* remove unused Button import from dashboard layout ([#36](https://github.com/fugo101/grimoire/issues/36)) ([25da00f](https://github.com/fugo101/grimoire/commit/25da00fd4ad33569bb4af2f5b72a646a0008f72b))
* select dropdown in modal ([#33](https://github.com/fugo101/grimoire/issues/33)) ([cf74bf9](https://github.com/fugo101/grimoire/commit/cf74bf98a72204a25c01c4be62bcb3a37e0686d8))
* update shadcn to 4.1.2 to resolve path-to-regexp vulnerability ([#34](https://github.com/fugo101/grimoire/issues/34)) ([37c1a49](https://github.com/fugo101/grimoire/commit/37c1a49c6b7606dd192236df43f312d54a011332))

## [1.4.0](https://github.com/fugo101/grimoire/compare/v1.3.0...v1.4.0) (2026-04-04)


### 🚀 Features

* add loading UI for actions and dashboard routes ([#31](https://github.com/fugo101/grimoire/issues/31)) ([0917dac](https://github.com/fugo101/grimoire/commit/0917dac11f2af8c83272433a0623366156133017))

## [1.3.0](https://github.com/fugo101/grimoire/compare/v1.2.0...v1.3.0) (2026-04-03)


### 🚀 Features

* trigger clean release PR after history reset ([#28](https://github.com/fugo101/grimoire/issues/28)) ([bfd3cc3](https://github.com/fugo101/grimoire/commit/bfd3cc30d322df134dcfc0c59d7d361043dbe78e))

## [1.2.0](https://github.com/fugo101/grimoire/compare/v1.1.0...v1.2.0) (2026-04-03)

* This version consolidated previous changes into the record and standardized the tag format.

## [1.1.0](https://github.com/fugo101/grimoire/compare/v1.0.12...v1.1.0) (2026-04-03)

*   add category actions
*   add docker
*   add docker publish workflow
*   change cicd repo org
*   core feature
*   initial commit
*   minor fix
*   miro update
*   mobile UX improvements and CI/CD pipeline overhaul
*   refactor code
*   update npm version
*   update readme
*   update release flow
*   update release pr workflow
*   update release workflow
*   update release workflows
*   update runner
*   update workflows
