---
name: dev-browser-verify
description: Investigate and plan fixes for frontend issues on the user's running localhost app using dev-browser. Use whenever the user reports a UI bug, visual glitch, broken interaction, layout problem, console error, or frontend change on a running dev server — even when they don't explicitly mention browsers or debugging. Connects to the user's Chrome tab via remote debugging, inspects the live page (DOM, console, network, screenshots), produces a concrete implementation plan, and waits for explicit user approval before writing code.
---

# Dev Browser Verify

Turn a vague frontend brief ("modal is broken", "button does nothing") into a verified, approved fix plan by looking at the live running app **before** touching source.

Frontend bugs are often runtime-only: stale closures, event ordering, network races, CSS cascade, async state. Reading source first and guessing costs more than observing the actual page.

## Loop

1. **Connect** via `dev-browser --connect` to the user's tab.
2. **Reproduce & observe** — console, network, DOM, event flow, screenshot.
3. **Locate** responsible source via grep on text/testids/URLs seen in step 2.
4. **Plan** a minimal fix.
5. **Present and wait for approval.** Do not edit.

## Prereqs — verify, then stop if broken

- `dev-browser --help` works (else: `npm install -g dev-browser && dev-browser install`)
- A localhost tab is reachable. List tabs:
  ```bash
  dev-browser --connect <<'EOF'
  console.log(JSON.stringify(await browser.listPages(), null, 2));
  EOF
  ```
  If connect fails, ask the user to relaunch Chrome with `--remote-debugging-port=9222`. Don't kill their Chrome.
- If multiple localhost tabs exist, ask which one. Save the tab `id`.

## Investigation

Each `dev-browser --connect` call is a fresh sandbox — bundle related observations into one script. Attach `page.on("console")` and `page.on("pageerror")` **before** triggering the action, or you'll miss the logs.

Signals in rough priority order — whichever reveals the bug fastest:

- Console errors / page errors — usually point straight at the cause.
- Network — 4xx/5xx, wrong URLs, timing.
- Event reproduction — `page.click`, `page.fill`, `page.keyboard.press`, then observe.
- `page.snapshotForAI()` — structured DOM, cheaper than raw HTML.
- `page.evaluate(() => ...)` — computed styles, element geometry, framework state on `window`.
- Screenshot — for visual/layout bugs. Saved under `~/.dev-browser/tmp/`; read back with the Read tool.

Skeleton:

```bash
dev-browser --connect <<'EOF'
const page = await browser.getPage("TAB_ID");
const logs = [], errors = [];
page.on("console", m => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", e => errors.push(String(e)));
page.on("requestfailed", r => logs.push(`FAIL ${r.url()} ${r.failure()?.errorText}`));
page.on("response", r => { if (r.status() >= 400) logs.push(`HTTP ${r.status()} ${r.url()}`); });

// reproduce
await page.click('button:has-text("Save")');
await page.waitForTimeout(500);

console.log("ERRORS:", JSON.stringify(errors));
console.log("LOGS:", JSON.stringify(logs));
EOF
```

**Don't** navigate away, submit forms hitting real APIs, or clear storage on the user's tab without asking.

## Mapping browser → source

Grep for visible text, `data-testid`s, class names, failing URLs, or stack-trace paths. Read only the files you need.

## Plan format

```
## Root cause
<one or two sentences, grounded in observed evidence>

## Evidence
- <console error / network failure / screenshot path / file:line>

## Fix
- path/to/file:line — <what changes, why>

## Verification
- After fix: <specific browser check that would have caught this>
```

If the fix is one line, say so — don't inflate.

## Approval gate

After presenting the plan, stop. Don't edit, don't `npm install`, don't "just tweak one thing." Ask: *"Proceed with this, or want changes?"* Accept only unambiguous go-aheads ("yes", "go", "approved"). If the user wants changes, revise the plan and re-present — don't silently fold feedback into an implementation.

## Common failure modes

- Skipping investigation because the description sounds obvious. The page often contradicts the description.
- Reading source before observing runtime. Closures, races, and event ordering don't show in static code.
- Grand refactors as "fixes." Stay surgical.
- Editing before approval because the user seemed impatient. The gate is their safety net.
