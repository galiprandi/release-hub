# Critique: Fetcher (`/fetcher`)

**Date**: 2026-07-25
**Score**: 17/40
**Static violations**: 2

## Nielsen Heuristics
| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 3 | No query execution progress beyond button state |
| 2 | Match between system and real world | 2 | Query builder doesn't map to HTTP mental model |
| 3 | User control and freedom | 2 | No undo for edits, no recovery for delete |
| 4 | Consistency and standards | 2 | `rounded-lg` vs `rounded-md` inconsistency |
| 5 | Error prevention | 2 | URL parsing errors silently ignored |
| 6 | Recognition rather than recall | 3 | No visual distinction between executed vs draft |
| 7 | Flexibility and efficiency of use | 2 | Magic clipboard intrusive, no keyboard shortcuts |
| 8 | Aesthetic and minimalist design | 2 | Header cluttered with 3 control groups |
| 9 | Help users recognize, diagnose, recover | 1 | Generic error messages, no curl reconstruction |
| 10 | Help and documentation | n/a | No onboarding |

## Priority Issues
- **P0**: Design system violations (rounded-lg, uppercase tracking-tight)
- **P0**: Header cognitive overload — 3 control groups competing
- **P1**: QueryModal broken isTokenExpired (referenced but never set)
- **P1**: No query naming — history unscannable
- **P2**: Magic clipboard no opt-out or visual indicator
- **P3**: Actions cell primary action buried in hover

## Static Violations (2)
- fetcher/index.tsx:236 — `rounded-lg` (should be `rounded-md`)
- QueryModal.tsx:297 — `rounded-lg` (should be `rounded-md`)

## Strengths
- Magic clipboard detection (clever friction reducer)
- Double-line URL cell (domain muted, path foreground)
- Semantic status/response time badges
