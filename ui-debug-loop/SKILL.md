---
name: ui-debug-loop
description: Measurement-driven loop for reproducing and fixing visual bugs in a running web app with the ego-browser (ego lite) CLI. Use whenever anyone reports UI that is clipped, cut off, hidden, overflowing, spilling off the edge, invisible, or broken at some screen size — and whenever you are about to verify a CSS or layout fix, check responsive breakpoints, or debug a scroll-driven GSAP/ScrollTrigger/WebGL animation, or need to know which React component and source file rendered a broken element. Reach for this before eyeballing a screenshot or guessing viewport sizes; it tells you what to measure, how to sweep a viewport matrix, and how to prove a fix changed only what you intended. Especially use it when a bug "won't reproduce" but the reporter insists it is real — that usually means you are measuring the wrong box.
---

# UI debug loop

Visual bugs get fixed fast when you turn "it looks broken" into a number. A number
tells you which viewports fail, by how much, whether your fix worked, and whether it
broke anything else. Screenshots alone give you none of that, and reading CSS alone
gives you a theory instead of evidence.

The whole loop runs through `ego-browser nodejs <<'EOF' ... EOF`. Invoke the
`ego-browser` skill for the helper surface (task spaces, `js`, `cdp`, `openOrReuseTab`);
this skill is about *what to measure and in what order*.

## The loop

1. **Open the running app** and read the real geometry — viewport, header height,
   locale/theme, any pinned-scroll distance.
2. **Write one probe** that turns the complaint into a signed number per element
   (how far past which edge). Run it across a viewport matrix.
3. **Fix** the smallest thing the numbers point at.
4. **Re-sweep** to confirm the hits are gone — and prove the blast radius, that
   nothing outside the intended range moved.
5. **Screenshot** the fixed state. Geometry can't see colour-on-colour, z-index
   occlusion, or ugly-but-in-bounds.

Steps 2 and 4 are the same probe. Write it once, keep it in the session.

## Measure the leaf, not the container

This is the failure mode that burns whole sessions. A container can fit the viewport
perfectly while the text inside it hangs off both edges:

```css
.line  { position: absolute; left: 0; right: 0; white-space: nowrap; }  /* always fits */
.line > span { /* nowrap inherited — this is what actually overflows */ }
```

Any element pinned `left:0; right:0`, or `width:100%`, or a flex/grid container with
overflowing children, will report a clean `getBoundingClientRect()` forever. If your
sweep says "ok" everywhere and the user says it's broken, **you are measuring a box
that is defined to fit.** Measure the children too:

```js
const targets = el.children.length ? [...el.children] : [el]
```

Same principle for occlusion and clipping: check the element that paints, not the
wrapper that positions.

## Sweep a matrix, don't guess viewports

Never ask "does it break at 1440×900?" — ask which of 15 sizes break. Emulate rather
than resize the window: `cdp('Emulation.setDeviceMetricsOverride', {width, height,
deviceScaleFactor: 1, mobile: false})`, measure, repeat. A useful default matrix:

- Desktop: 2560×1440, 1920×1080, 1512×982, 1440×900, 1366×768, 1280×800
- Tablet: 1024×768, 834×1112, 768×1024
- Phone: 430×932, 390×844, 360×800, 320×700
- Short/landscape: 1366×623, 667×375 — these expose height-starved layouts that
  every portrait size hides

Run the matrix for **each locale/theme that changes copy length**. Long-word languages
(Vietnamese, German) overflow where English fits, which is why locale-scoped CSS
overrides exist in most codebases.

## A proportional bug has no safe size

If the font is sized in `vw` and the container in `%`, the overflow scales with the
viewport — you'll see roughly the same overflow at 320px and at 430px, and no
breakpoint anywhere is clean. That pattern (constant-ish overflow across widths) means
"this never worked", not "this breaks below X". Don't hunt for a boundary that
doesn't exist; change the ratio.

Conversely, an overflow that appears only in a narrow band is a real breakpoint bug —
bisect the band to find the exact edge and mention it in the fix comment.

## Prove the blast radius

A responsive fix is only safe if you can show what it did *not* touch. Measure, stash,
measure, restore:

```bash
# 1. measure computed values across the matrix with the fix in place  -> AFTER
git stash push -- path/to/file.css
# 2. wait for HMR, measure the same thing                             -> BEFORE
git stash pop
```

Then diff the two tables. The claim you want to make is "rows ≤768px changed, every
row above is byte-identical" — and now you can actually make it. This catches
media-query fixes that leak, specificity accidents, and cascade surprises that no
amount of reading the diff would reveal.

## Screenshot last, not first

Once the numbers are clean, capture the fixed state and look at it. Geometry can't
detect black text on a black background, an element hidden behind a higher `z-index`,
a font that failed to load, or a layout that technically fits and still looks wrong.
One screenshot per phase/state is enough.

## Ask DevTools instead of inferring

`cdp()` exposes the **full** Chrome DevTools protocol, not a subset — DOM, CSS,
Overlay, Network, Log, Performance, Accessibility, LayerTree and Emulation all
answer. That matters because the slowest part of UI debugging is usually inferring
things the browser already knows.

The single highest-value call is `CSS.getMatchedStylesForNode`: it returns every rule
that matched, **with its media query text**, in cascade order — so instead of reading a
stylesheet and reasoning about which breakpoint is active, you ask. See the
"why does this value win" probe in `references/probes.md`; it prints things like

```
clamp(20px, min(7.5vw, 3.8vh), 67px)   .huge   @media (max-width: 768px)
calc(46 * var(--px, 1px))              .localeVi .phase5Bottom .huge
                                       @media (min-width: 769px) and (max-width: 1850px)
```

Run it at two viewports and the active breakpoint stops being a guess. `DOM.enable`
and `CSS.enable` must be called first, once per heredoc.

Others worth reaching for, by symptom:

| Question | Call |
|---|---|
| Which rule/breakpoint set this value? | `CSS.getMatchedStylesForNode` (+ `CSS.getMediaQueries` for every breakpoint in the page) |
| Exact box incl. transforms, margin/border/padding quads | `DOM.getBoxModel` |
| Does it break in dark mode / reduced motion / print? | `Emulation.setEmulatedMedia` |
| Did a font or image fail to load? (invisible or wrong-width text) | `Network.enable` + `Log.enable` before reload, then `drainEvents()` |
| Does the scroll animation jank on a slow device? | `Emulation.setCPUThrottlingRate` `{rate: 4}` |
| Is it announced correctly / is it even in the a11y tree? | `Accessibility.getPartialAXTree` |
| Annotate an element before screenshotting | `Overlay.enable` + `Overlay.highlightNode` |

A caveat that saves a wasted loop: **`Page.captureScreenshot` with a `clip` returns a
black frame on WebGL/3D pages**, at any `deviceScaleFactor`, and `fromSurface: false`
throws `Unable to capture screenshot` outright. Capture the whole viewport with
`fromSurface: true` and crop afterwards if you need a detail view.

## React apps: ask React who painted it

The DOM tells you *which box* is wrong; it can't tell you which component rendered
it, what props/state put it there, or which file to edit. If the app imports
[`react-devtools-cdt-mcp/register`](https://react.dev/reference/dev-tools/react-devtools-cdt-mcp),
React answers those directly — no source-grepping for a hashed class name.

You don't need Chrome DevTools MCP for this. The package registers its tools on the
page through the `devtoolstooldiscovery` event, and any script can dispatch that
event — so probe 8 in `references/probes.md` calls the tools straight from `cdp()`.

| Question | Tool |
|---|---|
| Which component rendered this DOM node? | `react_get_component_by_dom_element` |
| Which props/hooks state produced this layout? | `react_get_component_by_uid` |
| Which file + line do I fix? | `react_get_component_source`, `react_get_owner_stack` |
| Why does the scroll animation jank? Who re-rendered? | `react_start_profiling` → interact → `react_stop_profiling` → `react_get_commit_report` |

Use it between steps 2 and 3 of the loop: the probe finds the offending node, React
names its component and source file, then you fix. Uids (`"r5"`) don't survive a
reload or HMR update — re-resolve after every edit.

Preconditions: dev build only, imported **before** `react-dom` in the entry file. If
it isn't there and you're about to add it, ask first — it's an app change, and it
slows every commit. If the tool list comes back empty, the import is missing or too late.

## Session boilerplate

Two things must be in **every** heredoc, because each invocation is a fresh CDP
connection and per-connection emulation resets:

```js
await useOrCreateTaskSpace(<id>)                                  // reuse, don't respawn
await cdp('Emulation.setFocusEmulationEnabled', { enabled: true }) // see Gotchas
```

Device metrics overrides *do* persist across heredocs; focus emulation does not.

## Gotchas

| Symptom | Cause | Fix |
|---|---|---|
| Scroll-driven animation never advances; pinned section scrolls away; elements frozen at initial state | The tab is backgrounded, so `document.visibilityState === 'hidden'` throttles `requestAnimationFrame` — GSAP's ticker and ScrollTrigger never update | `cdp('Emulation.setFocusEmulationEnabled', {enabled: true})` in every heredoc. Verify with `document.visibilityState` |
| `captureScreenshot()` writes an all-black image | WebGL/compositor surface isn't captured by that path | `cdp('Page.captureScreenshot', {format:'jpeg', fromSurface:true})`, then write the base64 yourself |
| `Page.captureScreenshot` with `clip` is black too, or `fromSurface:false` throws | The clip path re-renders offscreen and misses the GPU surface | Capture the full viewport and crop afterwards; don't chase it with DPR/`mobile` tweaks, they don't help |
| `CSS.getMatchedStylesForNode` returns `Node is not an Element` or empty | `DOM.enable`/`CSS.enable` weren't called on this connection, or the `nodeId` is stale | Enable both per heredoc and re-resolve the `nodeId` after any reload |
| `ReferenceError: Cannot determine intended module format` | The heredoc is ESM | `import fs from 'node:fs'`, never `require` |
| `SyntaxError: await is only valid in async functions` from a probe that looks fine | A backtick template literal inside a `String.raw\`...\`` block terminated the string early | Use string concatenation inside probes |
| `Runtime.evaluate timed out` | An in-page async scan looped too many times | Cap iterations (~200), or move the loop into Node with one `js()` call per step |
| Measurements are wildly negative / nonsensical | You measured while the page was scrolled somewhere else | `window.scrollTo(0,0)` and settle before each measurement |

## Scroll-driven UI: measure the rest state statically

For elements animated along a scroll timeline, the interesting state is where the
animation parks them. You don't need to drive the scroll to get there — neutralise the
transform and read the CSS rest position directly:

```js
el.style.transform = 'none'; el.style.opacity = '1'; el.style.visibility = 'visible'
// measure, then restore: el.style.cssText = prev
```

This is equivalent to the animated rest position, needs no `rAF`, and turns a
30-second scroll scan into a 300ms one — which is what makes a 15-viewport × 2-locale
sweep practical. Drive the real scroll only when you need to check the *transition*,
or to screenshot.

## When you can't reproduce

If several honest sweeps come back clean and the reporter is sure, work through this
in order before asking them for their window size:

1. Are you measuring the leaf, or a container that's defined to fit? (most likely)
2. Are you measuring the state the animation actually rests in?
3. Is the failing axis one you didn't check — the fixed header's bottom edge, the
   horizontal axis, occlusion, contrast?
4. Is it a locale/theme you didn't load?
5. Only then: capture a screenshot at the reporter's exact viewport and *look*.

Asking the user to reproduce it for you is the last resort, not the second step.

See `references/probes.md` for ready-to-paste measurement probes.
