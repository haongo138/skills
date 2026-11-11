# State machines

Use for lifecycles: orders, tickets, deployments, connections, auth sessions, UI components.

## Notation

| Element            | ASCII                         |
|--------------------|-------------------------------|
| Initial state      | `o -->`                       |
| Final state        | `(o)`                         |
| State              | box with the state name       |
| Transition         | arrow labeled `event [guard] / action` (short) |
| Self-transition    | small loop `+--+` on the box side, labeled |
| Composite state    | big box holding sub-states, name top-left |

Label transitions with the **event** that causes them. Add `[guard]` or `/ action` only when it
matters for the question being answered.

## Template: document workflow

```text
          +---------+   submit   +-----------+
  o ----> |  Draft  | ---------> |  Review   |
          +---------+            +-----------+
               ^                   |       |
               |     reject        |       | approve
               +-------------------+       v
                                     +-----------+
                                     | Published |
                                     +-----------+
                                           |
                                           | archive
                                           v
                                          (o)
```

## Template: connection with self-transition and timeout

```text
                   +--------------+
  o --- dial ----> |  Connecting  |-----+
                   +--------------+     | retry [n<3]
                     |      |   ^       |
          connected  |      |   +-------+
                     v      |
           +-----------+    | timeout [n>=3]
           |   Open    |    v
           +-----------+  +----------+
             |            |  Failed  |
       close |            +----------+
             v
          +--------+
          | Closed |
          +--------+
```

## Template: state table (when there are more than about 6 states)

A transition table is often clearer than a diagram for big machines. Put it in the same code
block as a small overview diagram if both are useful.

```text
 State        | Event      | Guard     | Next        | Action
--------------+------------+-----------+-------------+------------------
 Pending      | pay        |           | Paid        | capture funds
 Pending      | cancel     |           | Cancelled   |
 Paid         | ship       | stock > 0 | Shipped     | create label
 Paid         | refund     |           | Refunded    | reverse payment
 Shipped      | deliver    |           | Delivered   |
```

## Pitfalls

- Unlabeled transitions: every arrow between states needs its event.
- Mixing states and actions: states are nouns or adjectives ("Paid"), events are verbs
  ("pay").
- Missing terminal states: show `(o)` only if the machine really ends.
