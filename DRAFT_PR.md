# 🐜 Carol: refactor(fetcher) resonance

## Scope of Work

Refining the Fetcher module to align with the **Industrial Resonance V2** design standard.

### 🎯 Objectives

1.  **Fetcher Dashboard (`/fetcher`)**:
    *   Migrate legacy empty state to the centralized `EmptyState` component for better consistency.
    *   Elevate `QueriesTable` with V2 table aesthetics:
        *   `text-[10px]` metadata cells.
        *   Group hover actions and vertical dividers.
        *   Standardized semantic badges (20% opacity).
2.  **Query Modal**:
    *   Refine input section (Method/URL) for better visual flow.
    *   Standardize internal tabs with `FilterBar` aesthetics.
    *   Harmonize response metadata in the footer using semantic tokens.
3.  **Consistency & Hygiene**:
    *   Eliminate hardcoded status colors.
    *   Ensure strict accessibility (aria-labels).
    *   Update `DESIGN.md` and `CROMA.md`.

## Territory Block

This PR blocks the Fetcher module for refinements.
