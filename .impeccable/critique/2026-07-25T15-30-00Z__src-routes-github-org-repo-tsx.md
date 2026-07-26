# Critique: Repo Detail (`/github/$org.$repo`)

**Date**: 2026-07-25
**Score**: 24/40
**Static violations**: 38

## Nielsen Heuristics
| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 3 | No at-a-glance "both green" indicator for staging vs prod |
| 2 | Match between system and real world | 3 | "Force Redeploy" is internal jargon without explanation |
| 3 | User control and freedom | 2 | No confirmation step before tag creation or freeze |
| 4 | Consistency and standards | 2 | `rounded-lg` on close buttons (should be `rounded-md`) |
| 5 | Error prevention | 1 | No confirmation for ANY high-stakes action |
| 6 | Recognition rather than recall | 3 | AI summary auto-generates silently |
| 7 | Flexibility and efficiency of use | 3 | No keyboard shortcut to open PromoteDialog |
| 8 | Aesthetic and minimalist design | 3 | PromoteDialog expanded mode (max-w-5xl) overwhelming |
| 9 | Help users recognize, diagnose, recover | 2 | Generic error messages in dialogs |
| 10 | Help and documentation | 2 | No inline help for "What is force redeploy?" |

## Priority Issues
- **P0**: PromoteDialog no confirmation before tag creation
- **P0**: FreezeDialog no confirmation before branch protection change
- **P1**: FreezeDialog uses undefined `bg-info` token
- **P1**: PromoteDialog pending commits calculation fragile (shows ALL if prod commit not found)
- **P2**: No staging vs production comparison view
- **P2**: PromoteDialog close button `rounded-lg` (should be `rounded-md`)
- **P3**: ForceRedeployDialog steps could be collapsible

## Static Violations (38)
- SekiPipelineMonitor.tsx: 15
- PulsarBuildMonitor.tsx: 9
- $org.$repo.tsx: 5
- CommitsModal.tsx: 5
- PromoteDialog.tsx: 4
- FreezeDialog.tsx: 0
- ForceRedeployDialog.tsx: 0

Categories: Containers/Backgrounds (22), Text Opacity (8), Borders (6), Focus (2)
