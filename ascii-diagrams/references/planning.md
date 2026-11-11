# Planning diagrams: Gantt, timeline, git branch graph

## Gantt chart

Use one row per task and one fixed-width column per time unit (5 columns per week works well).
Put the header and the axis first.

```text
Task            W1   W2   W3   W4   W5   W6
--------------  ---- ---- ---- ---- ---- ----
Design          ####
Backend API          #### ####
Frontend                  #### ####
Integration                    ####
QA                                  ####
Launch                                   *
--------------  ---- ---- ---- ---- ---- ----
Legend: #### = active, * = milestone
```

- Bars: `####` active, `....` slack or planned, `====` critical path.
- Milestones: `*` in the column where they land; dependencies can be noted at the end of the
  row (`(after Backend)`).
- Use 12 time columns at most at 80 columns. Use months or sprints for longer spans.

## Timeline (events)

```text
2026-01        2026-03         2026-06              2026-09
   |              |               |                    |
---*--------------*---------------*--------------------*------->
   |              |               |                    |
 v1.0 GA      SSO added     EU region live       v2.0 (planned)
```

Dates go on top and events below. Each `*` sits in the same column as its date and event.
For incident timelines, use a vertical list instead:

```text
01:43:36  token created + bundle buy (slot 460260236)
   |
01:43:54  curve complete, migrated to PumpSwap
   |
01:50:05  dev dump: 701M tokens -> 77.6 SOL
   |
01:50:08  creator fees swept (29.8 SOL)
```

## Git branch graph

Time goes left to right. Commits are letters or `o`, and branch names are on the left. Use `\`
and `/` for branch and merge, placed in the column between the parent and child commits.

```text
main      A---B-----------E---F
               \         /
feature         C---D----
```

Release flow with a hotfix:

```text
hotfix                H
                     / \
main      A---------B---M---------R
           \       /     \       /
develop     C--D--E---F---G--K--L
```

(`develop` branches from A and merges into B; the hotfix H branches from B and merges as M;
M is merged back into develop at G; release R merges L.)

- One branch per row. The diagonals `\` `/` occupy exactly the column between the two commits
  they connect, on the row between the branches.
- Label tags in brackets above or below the commit: `R [v2.1.0]`.
- Matches `git log --graph --oneline` style closely enough for documentation. For the real
  history, run that command instead of drawing it.
