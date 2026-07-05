## 2024-05-22 - [Typography Standard Enforcement]
**Learning:** Legacy use of `text-[9px]` in several modules (GitHub, Kubernetes, Seki) violated the high-density technical standard of `text-[10px]`. Enforcing `text-[10px]` globally improves legibility while maintaining the desired technical density.
**Action:** Always verify that metadata and small labels adhere strictly to the `text-[10px]` standard defined in `DESIGN.md`.

## 2024-05-22 - [Semantic Token Alignment in Dialogs]
**Learning:** Core components like `ConfirmDialog` often harbor hardcoded colors or generic Tailwind classes (e.g., `bg-yellow-600`) that break theme consistency. Migrating to semantic tokens (e.g., `bg-warning`) ensures the UI responds correctly to theme variables.
**Action:** Audit core dialogs for hardcoded colors and replace them with semantic tokens from the OKLCH theme.

## 2025-05-14 - [Modal Search & Geometry Alignment]
**Learning:** Search inputs within modals (like `CommitsModal`) often lag behind global search standards, missing clear buttons and proper accessibility labels. Additionally, badge geometry must consistently use `rounded-md` to maintain the Industrial Resonance V2 aesthetic.
**Action:** When implementing or refactoring modals, ensure search inputs include a clear button, `aria-label`, and align with `bg-muted/40` styling. Verify all badges use `rounded-md` geometry.

## 2025-05-22 - [AI and High-Density Header Standard]
**Learning:** AI-driven actions (like "Resumir con IA") must use semantic `ai` tokens (`text-ai`, `bg-ai/10`) and `rounded-lg` geometry to distinguish them from standard operations. High-density headers (e.g., `LogsViewer`) require consistent uppercase labels and `rounded-md` geometry for status indicators (e.g., "Live").
**Action:** Standardize all AI buttons with `text-ai` and `bg-ai/10`. Ensure all header indicators and tooltips in high-density components use uppercase tracking-wider typography and appropriate Radix UI Tooltip Arrows.
