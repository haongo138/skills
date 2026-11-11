# Sequence diagrams

Use when the *order of messages between parties* is the point: API calls, auth handshakes,
service-to-service flows, protocol exchanges, on-chain transaction flows.

## Layout rules

- Participants go left to right in order of first involvement. Usually the caller is on the
  left and storage on the right.
- Lifelines are `|` at a fixed spacing (18 columns works for 4 participants at 80 columns).
  Compute each lifeline column once and keep it fixed on every row.
- Each message takes **two rows**: a label row, then the arrow row. The label sits between the
  two lifelines it connects.
- Requests are solid `---->`; responses or async replies are dashed `<- - - -`.
- Time runs downward. Never draw a message going up.
- Self-call: `|--+` on one row, `|<-+` on the next, label to the right.
- Use 4-6 participants at most. If there are more, group them ("Backend") or split the diagram.

## Template (4 participants, lifelines at columns 4 / 22 / 40 / 58)

```text
 Client            Gateway            Auth               DB
    |                 |                 |                 |
    |  POST /login    |                 |                 |
    |---------------->|                 |                 |
    |                 |  verify(creds)  |                 |
    |                 |---------------->|                 |
    |                 |                 |  SELECT user    |
    |                 |                 |---------------->|
    |                 |                 |  user row       |
    |                 |                 |<- - - - - - - - |
    |                 |  JWT            |                 |
    |                 |<- - - - - - - - |                 |
    |  200 + token    |                 |                 |
    |<- - - - - - - - |                 |                 |
    |                 |                 |                 |
```

## Fragments (alt / loop / opt)

Draw a frame across the lifelines it covers. Put the fragment kind and guard in the top-left.
Separate `alt` branches with a dashed line.

```text
 Client            API                Cache              DB
    |                 |                 |                 |
    |  GET /item/42   |                 |                 |
    |---------------->|                 |                 |
  +-[ alt: cache hit ]---------------------------------------+
  | |                 |  get(42)        |                 |  |
  | |                 |---------------->|                 |  |
  | |                 |  item           |                 |  |
  | |                 |<- - - - - - - - |                 |  |
  +- - - [ else: miss ] - - - - - - - - - - - - - - - - - - -+
  | |                 |  SELECT ... id=42                 |  |
  | |                 |---------------------------------->|  |
  | |                 |  row            |                 |  |
  | |                 |<- - - - - - - - - - - - - - - - - |  |
  +----------------------------------------------------------+
    |  200 item       |                 |                 |
    |<- - - - - - - - |                 |                 |
```

A message can skip lifelines (API to DB above): draw the arrow straight across and leave the
lifelines in between hidden by the dashes.

## Self-call and async notes

```text
 Worker             Queue
    |                 |
    |--+ retry(n+1)   |
    |<-+              |
    |  ack (async)    |
    |. . . . . . . . >|
```

## Pitfalls

- Lifeline drift: a `|` one column off on a single row. Every row must be built from the same
  column list.
- Label longer than the gap: shorten it ("SELECT user") or widen the spacing for **all**
  lifelines.
- Too many request/response pairs: merge trivial ones ("auth round-trip"), or keep only the
  messages that matter for the question.
