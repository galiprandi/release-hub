## 2025-05-15 - [Unified Project Management UX Refinement]
**Learning:** Icon-only action buttons in quick-create forms or selection dialogs (like Save/Cancel) often lack visual discoverability for sighted users even when `aria-label` is present. Additionally, manual empty states lead to visual inconsistency across modules.
**Action:** Always wrap icon-only actions in Radix Tooltips to match the "Industrial Resonance V2" standard and prioritize the shared `EmptyState` component with a `min-h-0` override for compact dialog contexts.

## 2025-05-20 - [Icon-Only Button Standardization]
**Learning:** Native `title` attributes on icon-only buttons provide poor UX (delayed tooltips, inconsistent styling) and often hide accessibility regressions. Standardizing on an `IconButton` component that wraps Radix Tooltips ensures immediate visual discoverability while enforcing mandatory `aria-label` and `aria-expanded` attributes.
**Action:** Use `IconButton` for all icon-only actions, ensuring it supports prop spreading for full accessibility parity and interaction handlers (like `onPointerDown` for focus management).

## 2026-07-15 - [Search & Dialog Accessibility Standardization]
**Learning:** Adding tooltips to existing accessible icon buttons (with sr-only text) can cause test failures due to ambiguous matches (multiple instances of the same text in the DOM). Testing should target the interactive role or handle multiple occurrences explicitly. Standardizing "No results" with a shared component ensures visual consistency and better user guidance.
**Action:** Use `EmptyState` for search dropdowns and ensure tests use specific queries like `getByRole('button', { name: '...' })` when tooltips are present.

## 2026-07-20 - [Enhanced CopyButton for Diverse Contexts]
**Learning:** Raw clipboard-copy interactions are frequently implemented silently without visual or screen reader feedback, creating accessibility gaps. Standardizing copy interactions on a single `CopyButton` with customizable tooltips and localized aria-labels ensures unified, accessible, and delightful interactive copy feedback across different data modules.
**Action:** Always leverage `CopyButton` instead of raw `navigator.clipboard` or generic `ActionButton` copy flows, specifying `tooltip` to provide contextual screen reader and tooltip descriptions.

## 2026-07-22 - [In-place list edit accessibility and ID uniqueness]
**Learning:** In-place edit views within mapped lists (like dynamic dialog lists or project dashboards) frequently duplicate label-input relationships. Hardcoded IDs lead to screen reader confusion and broken focus targets. Utilizing dynamic, composite IDs (e.g., `edit-name-${item.id}`) ensures correct and unique label association across multiple active list items.
**Action:** Always construct dynamic IDs using parent/item IDs for list-mapped inputs/labels, maintaining correct WAI-ARIA and HTML5 association.

## 2026-07-25 - [Standardizing Header Icon-Only Actions with IconButton]
**Learning:** Hardcoded icon-only buttons with manual Tooltip configurations lead to highly redundant code, visual alignment drift, and accessibility inconsistencies across page headers. Leveraging the unified `<IconButton>` component automatically guarantees consistent hover timing, correct Spanish focus ring feedback, and clean, standardized layout geometry.
**Action:** Always refactor custom-wrapped header/sidebar icon actions to use the standardized `<IconButton>` component to prevent styling drift and accessibility regression.
