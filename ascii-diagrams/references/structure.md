# Structure diagrams: class (UML), ER diagram, trees

## Class diagram

A box has three compartments: name / fields / methods. Leave out empty compartments, except
keep the name. Visibility: `+` public, `-` private, `#` protected. Stereotypes go above the
name: `<<interface>>`, `<<abstract>>`, `<<enum>>`.

| Relationship              | ASCII (arrow points at the target) |
|---------------------------|------------------------------------|
| Inheritance (extends)     | `^` above a `|` line from the child |
| Realization (implements)  | `^` above a `:` line from the class |
| Association               | `------>`                          |
| Dependency (uses)         | `......>`                          |
| Aggregation (has, shared) | `<>----->`  (diamond on the owner) |
| Composition (owns)        | `<#>---->`  (diamond on the owner) |
| Multiplicity              | `1`, `0..1`, `*`, `1..*` beside the ends |

### Template

```text
        +-------------------+
        |   <<interface>>   |
        |     Repository    |
        +-------------------+
        | + find(id): T     |
        | + save(T): void   |
        +-------------------+
                  ^
                  : implements
                  :
        +-------------------+          +-----------------+
        |   SqlRepository   |<>------->|   Connection    |
        +-------------------+  1    1  +-----------------+
        | - conn: Conn      |          | + query(): Rows |
        +-------------------+          +-----------------+
        | + find(id): T     |
        | + save(T): void   |
        +-------------------+
```

Show only the members that matter for the point being made. If a class has more than about
6 members, show the important ones and add `| ...               |`.

## ER diagram

An entity box has the table name, then one row per column, with key markers `PK` / `FK` in a
fixed-width prefix. Draw a relationship line between the boxes, with cardinality at each end.

| Cardinality  | Mark at that end |
|--------------|------------------|
| exactly one  | `1`              |
| zero or one  | `0..1`           |
| many         | `*`              |
| one or more  | `1..*`           |

Crow's-foot alternative, if the user prefers it: `||--o{` (one to zero-or-many),
`||--||` (one to one), `}o--o{` (many to many).

### Template

```text
+--------------+        +----------------+        +--------------+
| users        |        | orders         |        | products     |
+--------------+        +----------------+        +--------------+
| PK id        |1      *| PK id          |*      1| PK id        |
|    email     |--------| FK user_id     |--------|    name      |
|    name      |        | FK product_id  |        |    price     |
+--------------+        |    created_at  |        +--------------+
                        +----------------+
```

Rules:
- Put the relationship line on the row of the FK it represents when you can.
- Many-to-many always goes through a join table box; don't draw `*----*` directly unless you
  are drawing a conceptual model.
- Show only the columns needed to explain the relationships (keys plus a few key fields).

## Trees (directories, hierarchies, decision trees)

### Directory tree (matches `tree --charset=ascii`)

```text
service/
|-- cmd/
|   `-- server/
|       `-- main.go
|-- internal/
|   |-- api/
|   |   `-- handlers.go
|   `-- store/
|       `-- postgres.go
|-- go.mod
`-- README.md
```

- Use `|--` for a child with more siblings below it, and `` `-- `` for the last child.
- Use `|   ` (pipe plus 3 spaces) to continue an ancestor's line, and 4 spaces once it has ended.
- Put a trailing `/` on directories. Add short comments aligned in one column: `main.go   # entrypoint`.
- Unicode form: `├──`, `└──`, `│   `.

### Hierarchy / org chart (top-down)

```text
                 +-----------+
                 |    CTO    |
                 +-----------+
                       |
        +--------------+--------------+
        |              |              |
  +-----------+  +-----------+  +-----------+
  | Platform  |  |  Product  |  |   Data    |
  +-----------+  +-----------+  +-----------+
```

### Decision tree

```text
Request arrives
|-- authenticated?
|   |-- no  --> 401
|   `-- yes
|       |-- rate limit ok?
|       |   |-- no  --> 429
|       |   `-- yes --> handle request
|       `-- (end)
`-- (end)
```

Use the indented form for deep trees. Use the boxed top-down form (as in the org chart) for at
most 3 levels.
