# 🐜 Carol: refactor(github) resonance polish

## Scope of UI/UX Refinements

This PR implements a series of high-precision adjustments to the GitHub Dashboard and Repository Detail views to align with the **Industrial Resonance V2** design standards.

### 📍 GitHub Dashboard (`/github`)
- **Organization Headers**: Standardizing typography to `text-[10px] font-bold uppercase tracking-wider` with 60% opacity for a technical, high-density look.
- **Pending Commits Badge**: Elevating visual hierarchy using `bg-warning/20` and `border-warning/20` tokens.
- **Health Indicators**: Normalizing status dots with 20% semantic opacities and compact metadata typography.
- **Action Hygiene**: Ensuring consistent `ActionButton` geometry and alignment across repo rows.

### 📍 Repository Detail (`/github/$org/$repo`)
- **Header Actions**: Refactoring external links (PRs, Actions) in the `FilterBar` to use standard `rounded-lg` geometry, `bg-muted/40` backgrounds, and `text-[10px]` bold uppercase labels.
- **Status Indicators**: Standardizing counters for PRs and Actions with consistent semantic opacities and pulse animations for active states.

### 🛠 Technical Excellence
- Zero hardcoded colors; strict adherence to semantic tokens.
- Full build validation to ensure zero regressions.
- Documentation updates in `AGENTS.md` and `DESIGN.md`.

---
*Status: Ready for Review (Carol 🐜)*
