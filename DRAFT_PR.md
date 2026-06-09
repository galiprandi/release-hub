# PR Draft: Hygiene & Technical Entropy Cleanup

## Objective
Eradicate technical entropy, dead code, and non-standard directory naming to achieve AAA engineering standards and a zero-warning build.

## Scope
- **Directory Standardization**: Rename `src/docker/componentes` to `src/docker/components`.
- **Dead Code Elimination**: Remove orphan hooks `useJqSetup.ts` and `useGitTagsSimple.ts`.
- **Type Hygiene**: Replace `any` usages with strict interfaces or `unknown` where appropriate.
- **Build Hygiene**: Resolve linter/build warnings to ensure a clean log.

## Technical Details
- Refactoring of directory structure and imports.
- Explicit typing for API responses and event handlers.
- Validation via `npm run test` and `npm run build`.

## Bitacora (CROMA.md)
- [x] Phase 0: Territory Block.
