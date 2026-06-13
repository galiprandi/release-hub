# PR Draft: GitHub UI Resonance Refactor 🐜

## Scope
This PR implements the Industrial Resonance V2 standard in the GitHub module, evolving the dashboard towards a higher density and better integration with the global product layout.

### UI/UX Refinement (Industrial Resonance V2)
- **Header Integration**: Moving collection navigation (`IndustrialTabs`) and project management actions to the `PageLayout` header for better visibility and consistency with Kubernetes/Docker modules.
- **Global Filtering**: Promoting the "Pendientes" filter to a dashboard-level control, reducing redundancy across organization tables.
- **High-Density Typography**: Updating column headers and technical metadata cells (`Health`, `PRs`, `Workflows`, `Date`, `Author`) to the technical standard (`text-[10px] font-bold uppercase tracking-wider`).
- **Semantic Health**: Refining health indicators with standard pulse animations for OK states.

### Technical Hygiene
- Eradicating redundant local filters and simplifying table configurations.
- Ensuring full compliance with `DESIGN.md` and `AGENTS.md`.
- Zero-warning build log maintenance.

## Impact
- Seamless navigation between repository collections.
- Consistent visual language across all system modules.
- Enhanced "Time to Value" by surfacing pending promotions and health status more effectively.

---
*Status: Ready for Review 🐜*
