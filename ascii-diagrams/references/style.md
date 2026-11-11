# Style guide: shapes, arrows, layout, charsets

## Shapes (pure ASCII)

| Meaning                     | Shape                          | Notes                                       |
|-----------------------------|--------------------------------|---------------------------------------------|
| Process / step              | `+-------------+` box          | Verb-first label, at least 1 space padding  |
| Decision                    | `< Valid? >`                   | Branches leave from the right and bottom    |
| Start / end / terminal      | `( Start )` `( End )`          | Also `(o)` for a UML final state            |
| Compact node (inline flows) | `[ Ingest ]`                   | Pipelines, swimlanes, git graphs            |
| External actor / system     | `[ User ]` or a labeled box    | Keep outside system boundaries              |
| Boundary / group / VPC      | big box with label top-left    | Children sit inside with 1-2 columns margin |
| Data store                  | cylinder (below)               | Or a box labeled `(DB)` when space is tight |
| Queue / topic               | `[== orders ==]`               |                                             |
| Note                        | `(note: ...)` beside the node  | Use sparingly                               |

Data store cylinder:

```text
 .-----------.
(  Orders DB  )
 '-----------'
```

## Arrows and edges

| Edge                                | ASCII              |
|-------------------------------------|--------------------|
| Flow / sync call                    | `-->`  `v`  `^`    |
| Return / async / dependency         | `..>`  `<- - -`    |
| Critical or primary path            | `==>`              |
| Bidirectional                       | `<-->`             |
| Labeled edge                        | `-- yes -->`  or the label on its own line beside a vertical edge |
| Inheritance / realization (UML)     | `^` on `|` / `^` on `:`   |
| Aggregation / composition (UML)     | `<>---`  /  `<#>---`      |

- Arrowheads touch the target: `--->|` or `v` directly above a box's top border.
- Vertical edge: a `|` in the source box's center column, then `v` on the row just above the
  target.
- Put labels on horizontal edges inline (`-- no -->`). For vertical edges, put the label to the
  right of the `|`, or on its own line between `|` and `v`.
- A `+` on a line means a junction or corner. Never use `+` where two lines just cross; reorder
  the nodes so they don't cross at all.

## Layout grid

1. Pick the main axis: top to bottom (process), or left to right (pipeline, timeline,
   participants).
2. Give boxes **odd widths** so the center column is `start + (width - 1) / 2`.
3. Siblings in a row share the same top row and, ideally, the same width.
4. Spacing: 4-8 columns between boxes in a row; between rows, one connector row (`|`) plus one
   arrow row (`v`).
5. Branches: the "happy path" goes straight down the main column; exceptions go out to the
   right. Loops go back up along the far left or right edge and are labeled.
6. Keep total width at 80 columns or less. If it won't fit, shorten labels first, then merge
   stages, then split into overview + detail diagrams.
7. Draw top to bottom and calculate columns as you go. Don't eyeball alignment; count it, then
   run `scripts/lint.js`.

Worked micro-example (box width 19, center column 9):

```text
+-----------------+
|   Read config   |
+-----------------+
         |
         v
+-----------------+
|    Validate     |
+-----------------+
```

## Unicode variant

Use it only when the user asks or the destination is known to render it (most modern
terminals, GitHub, IDEs). It is never right for some legacy consoles or plain emails.

| ASCII | Unicode              |
|-------|----------------------|
| `+` corners | `┌ ┐ └ ┘` (rounded `╭ ╮ ╰ ╯` for terminals) |
| `+` junctions | `├ ┤ ┬ ┴ ┼` |
| `-` / `|` | `─` / `│` (double `═ ║` for critical path) |
| `>` `<` `v` `^` heads | `▶ ◀ ▼ ▲` or `→ ← ↓ ↑` |

```text
┌──────────────┐     ┌──────────────┐
│  Read input  │────▶│   Validate   │
└──────────────┘     └──────────────┘
```

Check the Unicode version with `lint.js --unicode`. It maps box-drawing characters back to
ASCII before checking alignment.

## Embedding

| Destination        | How                                                               |
|--------------------|-------------------------------------------------------------------|
| Markdown / chat    | A fenced block with `text` as the info string                     |
| Python / shell     | Prefix every line with `# `; keep the grid after the prefix       |
| JS / TS / Go / C   | `// ` per line (avoid `*/` inside `/* */` blocks)                 |
| Docstrings         | Indent the block uniformly; no tabs                               |
| Commit messages    | Keep width at 72 columns or less                                  |

## Common pitfalls

- Off-by-one connectors: the `|` is one column off from the box center. Recalculate from the
  box start.
- Ragged right borders, because the inner label padding was miscounted. Every row of a box must
  be the same length.
- Labels wider than the box. Widen the whole box (top, sides and bottom), not just one row.
- Arrows without heads, or heads pointing the wrong way on return paths.
- Trailing spaces and tabs, which break alignment in some editors.
- Too many nodes. More than about 12 boxes usually means you should merge or split.
