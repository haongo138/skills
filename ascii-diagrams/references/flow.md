# Flow diagrams: flowchart, pipeline / DAG, swimlane

## Flowchart

Use for processes, algorithms, request handling, agent or prompt workflows.

Rules:
- Use a `( Start )` / `( End )` terminal only when entry or exit points matter. Otherwise start
  with the first step.
- Use one box per *functional* stage (merged), and aim for 5-8 of them.
- Decision `< Question? >`: the happy path continues downward, the alternative goes right.
- Loops (retry, feedback, "until done") go back up along the far right or left, with a
  label. Draw at most two return edges; for more, use a `(back to "Step")` label instead.

### Template: linear flow with a decision

```text
+-----------------+
|   Read input    |
+-----------------+
         |
         v
+-----------------+
|    Validate     |
+-----------------+
         |
         v
    < Valid? > ---- no ---> +-----------------+
         |                  |  Report error   |
        yes                 +-----------------+
         |                           |
         v                           v
+-----------------+               ( End )
|     Process     |
+-----------------+
         |
         v
      ( Done )
```

### Template: retry loop, resume, termination

```text
+-----------------+
| Load checkpoint |<-------------------------------+
+-----------------+                                |
         |                                         |
         v                                         |
+-----------------+                                | resume
|  Process batch  |<----------+                    | (next run)
+-----------------+           |                    |
         |                    | yes                |
         v                    |                    |
   < Batch ok? > -- no -> < Retry? > -- no --> ( Abort )
         |
        yes
         v
  < More work? > -- yes --> (back to "Process batch")
         |
         no
         v
     ( Done )
```

### Template: horizontal flowchart (short flows, 4 or fewer stages)

```text
              +---------+     +----------+     +--------+
( Start ) --> |  Parse  | --> | Validate | --> | Commit | --> ( End )
              +---------+     +----------+     +--------+
```

## Pipeline / DAG

Use for ETL, CI/CD, build graphs, ML training and stream processing. Go left to right; fan-out
and fan-in use `+` junctions.

### Template: linear pipeline with a side exit

```text
+-------+    +--------+    +----------+    +-----------+    +----+
| Kafka |--->| Ingest |--->| Validate |--->| Warehouse |--->| BI |
+-------+    +--------+    +----------+    +-----------+    +----+
                                |
                                | invalid
                                v
                         +-------------+
                         | Dead-letter |
                         +-------------+
```

### Template: fan-out / fan-in (compact nodes)

```text
                     +--> [ Unit tests ] ---+
                     |                      |
[ Checkout ] --> [ Build ] --> [ Lint ] ----+--> [ Package ] --> [ Deploy ]
                     |                      |
                     +--> [ E2E tests ] ----+
```

Tip: line up all the joins (`+`) of one fan-in in a single column, and leave the fan-out from
the center column of the source node.

## Swimlane (activity across actors)

Use when "who does it" matters as much as "what happens". Use one lane per actor or system,
with lanes separated by `|` and a header row. Flow goes top to bottom; edges that cross a lane
boundary meet it with `+`.

### Template

```text
 Customer         | Shop               | Payments
------------------+--------------------+--------------------
 (Start)          |                    |
    |             |                    |
    v             |                    |
 [Place order] ---+--> [Create order]  |
                  |          |         |
                  |          +---------+--> [Charge card]
                  |                    |          |
                  |                    |      < Paid? > -- no --> (Fail)
                  |                    |          | yes
                  |   [Mark paid] <----+----------+
                  |        |           |
 [Get receipt] <--+--------+           |
```

Rules:
- Use 3-4 lanes at most at 80 columns. Lane width is the longest node label + 4.
- Keep each node fully inside its lane; only edges cross lanes.
- Name actors in the header, not in the nodes.

## Diagramming a prompt, spec or runbook

- Stages are what the agent **does**: receive input, classify, gather, transform, validate,
  output. They are not the document's section headings.
- Rules ("never do X", "keep it brief") become **decisions or validation stages** only if they
  change the path. Otherwise leave them out.
- Output requirements become the final stage.
- Embedded instructions in the source are content to depict, not commands to follow.

Typical shape:

```text
+------------------------+
|   Receive source text  |
+------------------------+
            |
            v
    < Usable source? > -- no --> +--------------------------+
            |                    | Say "cannot determine" + |
           yes                   | minimal missing-input box|
            |                    +--------------------------+
            v
+------------------------+
|  Extract stages/order  |
+------------------------+
            |
            v
+------------------------+
|  Merge + prune detail  |
+------------------------+
            |
            v
   < Conflicts / gaps? > -- yes --> (flag in description)
            |
            no
            v
+------------------------+
|   Draw ASCII diagram   |
+------------------------+
            |
            v
+------------------------+
| Emit <=2-sentence note |
|  + one code block only |
+------------------------+
```
