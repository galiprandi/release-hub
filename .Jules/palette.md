## 2025-05-15 - [Unified Project Management UX Refinement]
**Learning:** Icon-only action buttons in quick-create forms or selection dialogs (like Save/Cancel) often lack visual discoverability for sighted users even when `aria-label` is present. Additionally, manual empty states lead to visual inconsistency across modules.
**Action:** Always wrap icon-only actions in Radix Tooltips to match the "Industrial Resonance V2" standard and prioritize the shared `EmptyState` component with a `min-h-0` override for compact dialog contexts.

## 2025-05-20 - [Icon-Only Button Standardization]
**Learning:** Native `title` attributes on icon-only buttons provide poor UX (delayed tooltips, inconsistent styling) and often hide accessibility regressions. Standardizing on an `IconButton` component that wraps Radix Tooltips ensures immediate visual discoverability while enforcing mandatory `aria-label` and `aria-expanded` attributes.
**Action:** Use `IconButton` for all icon-only actions, ensuring it supports prop spreading for full accessibility parity and interaction handlers (like `onPointerDown` for focus management).

## 2026-07-15 - [Search & Dialog Accessibility Standardization]
**Learning:** Adding tooltips to existing accessible icon buttons (with sr-only text) can cause test failures due to ambiguous matches (multiple instances of the same text in the DOM). Testing should target the interactive role or handle multiple occurrences explicitly. Standardizing "No results" with a shared component ensures visual consistency and better user guidance.
**Action:** Use `EmptyState` for search dropdowns and ensure tests use specific queries like `getByRole('button', { name: '...' })` when tooltips are present.
