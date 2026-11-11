# Probes

Paste-and-adapt measurement snippets. Each is a browser-side expression for `js()`.
Keep them in `String.raw` blocks and use string concatenation inside — a nested
backtick terminates the raw string and produces a confusing `await is only valid in
async functions` error.

All of them return **signed overflow numbers**, positive meaning "past the edge by N
px". That sign convention matters: it lets you diff two runs and see a fix shrink a
number rather than just flip a boolean.

## 1. Edge overflow, leaf-aware

The workhorse. Reports every element (and its painting children) that crosses the
viewport edges or hides under a fixed header.

```js
const OVERFLOW = String.raw`(() => {
  const hdr = document.querySelector('HEADER_SELECTOR')
  const hb = hdr ? hdr.getBoundingClientRect().bottom : 0
  const bad = []
  document.querySelectorAll('TARGET_SELECTOR').forEach(el => {
    // measure what paints, not the wrapper that positions
    const targets = el.children.length ? [...el.children] : [el]
    targets.forEach(node => {
      const r = node.getBoundingClientRect()
      const f = []
      if (hb - r.top > 0)              f.push('HDR+' + Math.round(hb - r.top))
      if (r.bottom - innerHeight > 0)  f.push('BOT+' + Math.round(r.bottom - innerHeight))
      if (-r.left > 0)                 f.push('L+' + Math.round(-r.left))
      if (r.right - innerWidth > 0)    f.push('R+' + Math.round(r.right - innerWidth))
      if (f.length) bad.push(node.textContent.trim().slice(0, 24) + ' ' + f.join(','))
    })
  })
  return bad
})()`
```

## 2. Viewport matrix sweep

Wraps any probe. Emulation is far more reliable than resizing the OS window, and
`deviceScaleFactor: 1` keeps the numbers in CSS pixels.

```js
const SIZES = [[2560,1440],[1920,1080],[1512,982],[1440,900],[1366,768],[1280,800],
               [1024,768],[834,1112],[768,1024],[430,932],[390,844],[360,800],
               [320,700],[1366,623],[667,375]]
for (const [w, h] of SIZES) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false })
  await js('window.scrollTo(0,0)')
  await wait(0.4)                       // let layout + any ScrollTrigger refresh settle
  const bad = await js(OVERFLOW)
  cliLog(w + 'x' + h + ' :: ' + (bad.length ? bad.join(' | ') : 'ok'))
}
```

Report every row, passes included. A wall of `ok` with two hits is the evidence; a
list of only the hits hides how much you actually covered.

## 3. Neutralise animation to read the rest position

For anything animated by GSAP/Framer/CSS transitions. Restore `cssText` afterwards so
the page is left as you found it and later probes aren't poisoned.

```js
document.querySelectorAll('TARGET_SELECTOR').forEach(el => {
  const prev = el.style.cssText
  el.style.transform = 'none'
  el.style.opacity = '1'
  el.style.visibility = 'visible'
  /* ...measure here... */
  el.style.cssText = prev
})
```

If a parent gates visibility (`visibility: hidden` on a container until the animation
initialises), unhide the parent too or every child measures as zero-size.

## 4. Find the true rest frame of a scroll animation

Only when you must confirm the *animated* position rather than the CSS one. Run the
loop inside the page so each step gets a real `rAF`; cap iterations to stay under the
`Runtime.evaluate` timeout.

```js
const REST = String.raw`(async () => {
  const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const spacer = document.querySelector('.pin-spacer')
  const dist = spacer.offsetHeight - spacer.firstElementChild.offsetHeight
  const els = [...document.querySelectorAll('TARGET_SELECTOR')]
  const best = new Map()
  for (let i = 0; i <= 200; i++) {
    window.scrollTo(0, Math.round((i / 200) * dist))
    await raf()
    for (const el of els) {
      // rest = the frame where the animated translate is closest to zero
      const ty = Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42)
      const p = best.get(el)
      if (!p || ty < p.ty) {
        const r = el.getBoundingClientRect()
        best.set(el, { ty, top: Math.round(r.top), bottom: Math.round(r.bottom) })
      }
    }
  }
  return [...best].map(([el, v]) => el.dataset.name + ' ty=' + Math.round(v.ty) + ' t' + v.top + ' b' + v.bottom)
})()`
```

Check the reported `ty` before trusting a hit. A large residual means you sampled
mid-flight, and mid-flight elements are *supposed* to be off-screen — that's a
sampling artifact, not a bug.

## 5. Occlusion and contrast

When geometry says the element is in-bounds but nobody can see it.

```js
const HIDDEN = String.raw`(() => {
  const el = document.querySelector('TARGET_SELECTOR')
  const r = el.getBoundingClientRect()
  const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2)
  const s = getComputedStyle(el)
  let bg = 'transparent', p = el
  while (p && bg === 'transparent') { bg = getComputedStyle(p).backgroundColor; if (bg === 'rgba(0, 0, 0, 0)') bg = 'transparent'; p = p.parentElement }
  return {
    topmostAtCentre: document.elementFromPoint(cx, cy)?.className,  // not your element => occluded
    contains: el.contains(document.elementFromPoint(cx, cy)),
    color: s.color, bg, opacity: s.opacity, visibility: s.visibility, zIndex: s.zIndex,
  }
})()`
```

`contains: false` means something is painting over it. Identical `color` and `bg`
means it's there and unreadable.

**`elementFromPoint` lies when `pointer-events: none` is in play** — hit-testing skips
those elements, so a decorative overlay reports "occluded by" whatever is *underneath*
it, on every element, at every size. A finding that fires uniformly across the whole
matrix is the tell. When the occluder is a `<canvas>`, a WebGL/3D layer, or anything
non-interactive, compare rectangles against the painted surface instead:

```js
const cv = document.querySelector('canvas').getBoundingClientRect()
const overlapY = Math.min(r.bottom, cv.bottom) - Math.max(r.top, cv.top)
const overlapX = Math.min(r.right, cv.right) - Math.max(r.left, cv.left)
if (overlapX > 0 && overlapY > 0) { /* really behind it */ }
```

And note the canvas box is usually **larger than the thing drawn inside it** — measure
the drawn extent off a screenshot once, express it as a fraction of the canvas, and
say so in the probe. Using raw canvas bounds reports collisions that aren't there.

## 6. Why does this value win?

Answers "which rule and which breakpoint is actually setting this" without reading the
stylesheet. `matchedCSSRules` comes back in cascade order (weakest first), so the last
entry that declares the property is the winner — barring `!important` or inline styles,
which live in `m.inlineStyle` and beat everything listed here.

```js
await cdp('DOM.enable'); await cdp('CSS.enable')   // once per heredoc

const whyWins = async (selector, prop) => {
  const doc = await cdp('DOM.getDocument', { depth: 1 })
  const { nodeId } = await cdp('DOM.querySelector', { nodeId: doc.root.nodeId, selector })
  const m = await cdp('CSS.getMatchedStylesForNode', { nodeId })
  const hits = []
  for (const entry of m.matchedCSSRules || []) {
    const r = entry.rule
    const decls = (r.style.cssProperties || []).filter(p => p.name === prop && p.text)
    if (!decls.length) continue
    hits.push({
      value: decls[decls.length - 1].value,
      sel: r.selectorList.text,
      media: (r.media || []).map(x => '@media ' + x.text).join(' AND ') || '(no media)',
    })
  }
  return hits          // last element = winner
}
```

Run it at two viewports that bracket a suspected breakpoint and the active rule stops
being a guess. `CSS.getMediaQueries` (no args) dumps every breakpoint the page defines,
which is a fast way to find the boundary you should be testing either side of.

CSS-module class names are hashed (`.scrolling-text_huge__Z2erq`), so match on the
stable part or on a `data-` attribute rather than the generated suffix.

## 7. Blast-radius diff

Prove a responsive fix only touched its intended range. Capture whatever computed
property the fix changes, across the matrix, before and after.

```js
const COMPUTED = String.raw`(() => [...document.querySelectorAll('TARGET_SELECTOR')]
  .map(el => Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10).join(','))()`
```

Run the matrix → save the table → `git stash push -- <file>` → wait for HMR → run the
matrix again → `git stash pop`. Diff the tables and state the containment explicitly,
e.g. "rows ≤768px changed; 769px and above are identical". Without this you're
asserting the media query works; with it you've shown it.

## 8. Ask React which component painted it

Needs `react-devtools-cdt-mcp/register` imported in the app (dev build, before
`react-dom`). Dispatches the same `devtoolstooldiscovery` event Chrome DevTools MCP
uses, then calls the tool in-page. Goes through `Runtime.evaluate` with
`awaitPromise` because tool `execute` may be async.

```js
const reactTool = async (name, args = {}) => {
  const expr = '(async () => {' +
    'const groups = [];' +
    'const e = new Event("devtoolstooldiscovery");' +
    'e.respondWith = g => groups.push(g);' +
    'window.dispatchEvent(e);' +
    'const tools = groups.flatMap(g => g.tools || []);' +
    'if (' + JSON.stringify(name) + ' === "list") return tools.map(t => ({ name: t.name, input: t.inputSchema }));' +
    'const t = tools.find(t => t.name === ' + JSON.stringify(name) + ');' +
    'if (!t) return { error: "tool not found", available: tools.map(t => t.name) };' +
    'return await t.execute(' + JSON.stringify(args) + ');' +
  '})()'
  const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  return r.exceptionDetails ? { error: r.exceptionDetails.text } : r.result.value
}

console.log(JSON.stringify(await reactTool('list'), null, 2))   // names + input schemas
const found = await reactTool('react_find_components', { name: 'COMPONENT_NAME' })
// then: react_get_component_by_uid / react_get_component_source with a uid from `found`
```

Run `list` first and build args from each tool's `inputSchema` — the package is
experimental and its arguments may change between releases. An empty list means the
import is missing or loads after React. Every tool returns a plain object, or
`{ error }` on failure; uids reset on reload/HMR.
