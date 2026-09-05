# Changelog

## [2.3.0](https://github.com/fugo101/grimoire/compare/v2.2.1...v2.3.0) (2026-09-05)


### 🚀 Features

* add a health endpoint and a container healthcheck ([#126](https://github.com/fugo101/grimoire/issues/126)) ([5a71d5a](https://github.com/fugo101/grimoire/commit/5a71d5a5fb68449997e3f6d76bb88d942050a9a6))
* **security:** add security headers and a nonce-based CSP ([#130](https://github.com/fugo101/grimoire/issues/130)) ([edf44e1](https://github.com/fugo101/grimoire/commit/edf44e1bb89519525ad8cc9828c4f9a6b7ae2cda))


### ⚡ Performance

* enable the React Compiler through Turbopack's Rust port ([#129](https://github.com/fugo101/grimoire/issues/129)) ([bb3558f](https://github.com/fugo101/grimoire/commit/bb3558f753aedf0b4f028de4bb456867875d5b35))

## [2.2.1](https://github.com/fugo101/grimoire/compare/v2.2.0...v2.2.1) (2026-09-05)


### 🐛 Bug Fixes

* declare the client boundary explicitly ([#109](https://github.com/fugo101/grimoire/issues/109)) ([89fba30](https://github.com/fugo101/grimoire/commit/89fba30d8d7264287afc4707553a1915b359c2aa))


### 📚 Documentation

* add agent skills configuration ([#124](https://github.com/fugo101/grimoire/issues/124)) ([59b6fe4](https://github.com/fugo101/grimoire/commit/59b6fe4263a7c9345057c9f92725c3831c21ac8e))
* commit the Next.js agent-rules block ([#123](https://github.com/fugo101/grimoire/issues/123)) ([abd0aea](https://github.com/fugo101/grimoire/commit/abd0aea62c22f409f5c8c75ccdf288ec17187ede))

## [2.2.0](https://github.com/fugo101/grimoire/compare/v2.1.1...v2.2.0) (2026-08-15)


### 🚀 Features

* port login and the public report to the App Router ([#99](https://github.com/fugo101/grimoire/issues/99)) ([0e84f00](https://github.com/fugo101/grimoire/commit/0e84f002c90aea583ea162f36787fd81a3cfd03f))
* port mutations to Server Actions and reads to Route Handlers ([#97](https://github.com/fugo101/grimoire/issues/97)) ([bc3456e](https://github.com/fugo101/grimoire/commit/bc3456eef18908455d52a54a1a8210e8da04cc3e))
* port the dashboard and manage screens to the App Router ([#98](https://github.com/fugo101/grimoire/issues/98)) ([d9f0590](https://github.com/fugo101/grimoire/commit/d9f0590571f12dfb485ebae12eec662c7428fef6))


### 🐛 Bug Fixes

* post-migration security and correctness audit ([#104](https://github.com/fugo101/grimoire/issues/104)) ([4789dd9](https://github.com/fugo101/grimoire/commit/4789dd9a407a24f2a2dadefa601ea9bbfb3ef4c5))


### 📚 Documentation

* rewrite CLAUDE.md and README for the App Router ([#102](https://github.com/fugo101/grimoire/issues/102)) ([d4efc29](https://github.com/fugo101/grimoire/commit/d4efc2917f7341a60a246bcb8802d453947251b9))


### ♻️ Refactors

* centralize search-param parsing ([#94](https://github.com/fugo101/grimoire/issues/94)) ([7da9b02](https://github.com/fugo101/grimoire/commit/7da9b026bfb2472676ee5d42c70cd7eea0c3038e))
* **db:** open the SQLite connection lazily ([#91](https://github.com/fugo101/grimoire/issues/91)) ([a54ee64](https://github.com/fugo101/grimoire/commit/a54ee6420054ddb795da1271c214688f5645225a))
* drive filters and the theme toggle through props ([#93](https://github.com/fugo101/grimoire/issues/93)) ([b51bc74](https://github.com/fugo101/grimoire/commit/b51bc749344ad2b89f6dd44e3733f456edc094a8))
* **server:** relocate schemas and COOKIE_OPTIONS ahead of Next.js ([#92](https://github.com/fugo101/grimoire/issues/92)) ([48ef7a0](https://github.com/fugo101/grimoire/commit/48ef7a0b3f0c184fa4a98292c40f2c659cd7587d))

## [2.1.1](https://github.com/fugo101/grimoire/compare/v2.1.0...v2.1.1) (2026-07-29)


### 🐛 Bug Fixes

* harden the auth boundary and close the database on shutdown ([#87](https://github.com/fugo101/grimoire/issues/87)) ([c603075](https://github.com/fugo101/grimoire/commit/c60307583fe2120367ddffec88e9816b70745094))


### ⚡ Performance

* index the transactions table and stop re-reading categories ([#88](https://github.com/fugo101/grimoire/issues/88)) ([c1962b2](https://github.com/fugo101/grimoire/commit/c1962b248ea4596d2e07c7f9bf052d6aec5a0f2f))

## [2.1.0](https://github.com/fugo101/grimoire/compare/v2.0.0...v2.1.0) (2026-07-29)


### 🚀 Features

* **dashboard:** add overview screen and thumb-reach navigation ([#84](https://github.com/fugo101/grimoire/issues/84)) ([cb803c0](https://github.com/fugo101/grimoire/commit/cb803c072ca569ebdd15f82578b934066063e171))
* **public:** rebuild the shared report around reading it ([#86](https://github.com/fugo101/grimoire/issues/86)) ([bff3df8](https://github.com/fugo101/grimoire/commit/bff3df87b1ee25059e0a435bb665f35b3e996b9c))
* **transactions:** replace the table and category select on mobile ([#85](https://github.com/fugo101/grimoire/issues/85)) ([26b5de0](https://github.com/fugo101/grimoire/commit/26b5de0aeafc221e3de2ee9496681c5436a2c482))
* **ui:** rebuild design system foundation for mobile and dark mode ([#82](https://github.com/fugo101/grimoire/issues/82)) ([16dc510](https://github.com/fugo101/grimoire/commit/16dc5103889b69ab126754411439b5624e064ddb))

## [2.0.0](https://github.com/fugo101/grimoire/compare/v1.9.2...v2.0.0) (2026-07-28)


### ⚠ BREAKING CHANGES

* migrate from Next.js to TanStack Start ([#79](https://github.com/fugo101/grimoire/issues/79))

### 🚀 Features

* migrate from Next.js to TanStack Start ([#79](https://github.com/fugo101/grimoire/issues/79)) ([7696002](https://github.com/fugo101/grimoire/commit/76960027bd586ac11bfcd12c6819e6ea1adbb9ad))

## [1.9.2](https://github.com/fugo101/grimoire/compare/v1.9.1...v1.9.2) (2026-07-08)


### 🐛 Bug Fixes

* correct ghcr image org name to fugo101 ([#70](https://github.com/fugo101/grimoire/issues/70)) ([5c09265](https://github.com/fugo101/grimoire/commit/5c09265c85d21cc6ba93f2fad76cd61593e525b0))


### 📚 Documentation

* add MIT license ([#68](https://github.com/fugo101/grimoire/issues/68)) ([beb2c1e](https://github.com/fugo101/grimoire/commit/beb2c1ef63e4c25dcace14c0b87a95a69d42cb1e))

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
