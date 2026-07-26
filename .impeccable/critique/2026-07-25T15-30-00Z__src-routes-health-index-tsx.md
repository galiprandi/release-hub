# Critique: Health Monitor (`/health`)

**Date**: 2026-07-25
**Score**: 23/40
**Static violations**: 7

## Nielsen Heuristics
| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 2 | No overall system health indicator or incident severity |
| 2 | Match between system and real world | 3 | Missing uptime %, SLA indicators, error budgets |
| 3 | User control and freedom | 2 | No bulk actions (recheck all unhealthy), no incident mode |
| 4 | Consistency and standards | 4 | Follows canon faithfully |
| 5 | Error prevention | 1 | No prevention, only error display |
| 6 | Recognition rather than recall | 2 | Status dots have no legend, no tooltips for states |
| 7 | Flexibility and efficiency of use | 2 | No keyboard shortcuts |
| 8 | Aesthetic and minimalist design | 4 | Clean, dense, ordered |
| 9 | Help users recognize, diagnose, recover | 2 | Errors truncated to 50 chars, no expansion |
| 10 | Help and documentation | 1 | Help dialog entirely in Spanish |

## Priority Issues
- **P0**: Error messages truncated to 50 chars with no expansion
- **P0**: No incident mode / high-stakes visual state for production down
- **P1**: Status dots too small (6px) for rapid scanning
- **P1**: Response time conflates health with performance
- **P1**: Help dialog entirely in Spanish
- **P2**: No uptime percentage or historical context
- **P2**: No bulk actions for incident response
- **P3**: No keyboard shortcuts

## Static Violations (7)
- bg-muted/30 containers: 5 (lines 64, 117, 119, 145, 502)
- rounded-lg on button: 1 (line 588)
- bg-destructive/10: 1 (line 518)
- rounded-lg on container: 1 (line 64)
