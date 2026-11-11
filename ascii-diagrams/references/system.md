# System diagrams: architecture, deployment, layered, C4 context

## Architecture / component diagram

Use it to show what talks to what. Nodes are services, stores, queues and external systems.
Edges are calls or data flows, labeled with the protocol or purpose when it adds information.

Rules:
- Entry point (users, clients) at the top or left; storage at the bottom or right.
- Draw trust or network boundaries (VPC, cluster, account, region) as big labeled boxes that
  contain their nodes.
- Put replicas or scale on the label, `API (x3)`, instead of drawing three boxes.
- Label edges with protocol or verb (`HTTPS`, `gRPC`, `publish`, `CDC`). Only label edges where
  it isn't obvious.
- Use 10 nodes at most per diagram. For bigger systems, draw a context diagram plus one
  diagram per area.

### Template: web service in a VPC

```text
    +-----------+
    |  Browser  |
    +-----------+
          |
          | HTTPS
          v
    +-----------+
    | Load bal. |
    +-----------+
          |
+---------|-----------------------------------+
| VPC     v                                   |
|  +-------------+       +-------------+      |
|  |  API (x3)   |------>|   Worker    |      |
|  +-------------+ queue +-------------+      |
|         |                     |             |
|         v                     v             |
|  +-------------+       +-------------+      |
|  |  Postgres   |       |  S3 bucket  |      |
|  +-------------+       +-------------+      |
+---------------------------------------------+
```

### Template: event-driven services

```text
+----------+  publish   +-----------------------+  consume   +-----------+
|  Orders  |----------->| [== order.created ==] |-----+----->|  Billing  |
+----------+            +-----------------------+     |      +-----------+
                                                      |
                                                      |      +-----------+
                                                      +----->|  Emails   |
                                                             +-----------+
```

## Deployment / network diagram

Same notation as above. Boundaries are physical or cloud scopes (region, AZ, node, pod).
Annotate nodes with runtime or size: `api (k8s, 3 pods)`, `pg (r6g.large)`.

```text
+----------------------------- Region us-east-1 -----------------------------+
|  +------------- AZ a -------------+    +------------- AZ b -------------+  |
|  |  +-----------+  +-----------+  |    |  +-----------+  +-----------+  |  |
|  |  |  api-1    |  |  pg (pri) |  |    |  |  api-2    |  |  pg (rep) |  |  |
|  |  +-----------+  +-----------+  |    |  +-----------+  +-----------+  |  |
|  +--------------------------------+    +--------------------------------+  |
+----------------------------------------------------------------------------+
```

Here the boundary label sits in the top border; lint still checks that the box closes.

## Layered architecture

```text
+-------------------------------+
|        Presentation (UI)      |
+-------------------------------+
|     Application / Services    |
+-------------------------------+
|            Domain             |
+-------------------------------+
|   Infrastructure (DB, MQ)     |
+-------------------------------+
```

Stacked layers share borders. Mark a violation or exception with an arrow on the side:
`<-- (UI reads DB directly: avoid)`.

## C4 context (system in its environment)

```text
   [ Customer ]                         [ Support agent ]
        |                                       |
        | places orders                         | handles refunds
        v                                       v
 +-------------------------------------------------------+
 |                  Shop System                          |
 |            (web app + APIs + workers)                 |
 +-------------------------------------------------------+
        |                       |                 |
        | charges cards         | sends mail      | reads stock
        v                       v                 v
  [ Stripe ]               [ SendGrid ]      [ ERP (legacy) ]
```

People and external systems are compact `[ ]` nodes; your system is the one big box. Label
every edge with the relationship, written as a verb phrase.

## Pitfalls

- Edges crossing a boundary box border: the line must pass through the border as `|` or `-`,
  with the arrowhead inside.
- Boxes of different heights in one row: keep sibling boxes the same height.
- Generic labels ("Service", "DB"): use the real names from the source.
