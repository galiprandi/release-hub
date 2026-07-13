## 2025-05-15 - [Unified Project Management UX Refinement]
**Learning:** Icon-only action buttons in quick-create forms or selection dialogs (like Save/Cancel) often lack visual discoverability for sighted users even when `aria-label` is present. Additionally, manual empty states lead to visual inconsistency across modules.
**Action:** Always wrap icon-only actions in Radix Tooltips to match the "Industrial Resonance V2" standard and prioritize the shared `EmptyState` component with a `min-h-0` override for compact dialog contexts.
