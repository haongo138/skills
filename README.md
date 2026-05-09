# Skills

A collection of Claude Code skills. Each skill lives in its own directory with a `SKILL.md` that Claude loads on demand.

## Available Skills

| Skill | Description |
|-------|-------------|
| [dev-browser-verify](./dev-browser-verify) | Investigate frontend bugs on a running localhost app via live browser inspection; produces a fix plan and waits for approval before editing. |
| [excalidraw-diagram](./excalidraw-diagram) | Draw editable diagrams in Excalidraw; default for all diagram requests. |
| [skill-builder](./skill-builder) | Create new skills, optimize existing ones, or audit skill quality following Claude Code best practices. |

## Installation

Skills are loaded from directories listed in your Claude Code plugin/skill config. Pick one of the following.

### Option 1: Clone and symlink into your skills directory

```bash
git clone https://github.com/<owner>/skills.git ~/src/skills
mkdir -p ~/.claude/skills
ln -s ~/src/skills/dev-browser-verify ~/.claude/skills/dev-browser-verify
```

Repeat the `ln -s` line for each skill you want installed.

### Option 2: Clone directly into `~/.claude/skills`

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/<owner>/skills.git ~/.claude/skills-repo
ln -s ~/.claude/skills-repo/dev-browser-verify ~/.claude/skills/dev-browser-verify
```

### Option 3: Per-project

Drop the skill directory (or a symlink to it) into `<project>/.claude/skills/`.

### Verify

Start a Claude Code session and run `/skills` (or ask "what skills do you have?"). The installed skill should appear by its `name:` from `SKILL.md`.

## Usage

Skills auto-trigger based on their `description`. You rarely need to invoke one by hand — just describe what you're doing and Claude matches the skill.

```
> the login button on http://localhost:3000 does nothing when I click it
```

The `dev-browser-verify` skill matches this and Claude will connect to your browser, reproduce, and propose a plan.

To invoke a skill explicitly:

```
> use the dev-browser-verify skill to investigate the modal bug
```

Each skill's `SKILL.md` documents its own prerequisites, inputs, and outputs. Read it before first use.

## Repository Layout

```
skills/
├── README.md              ← you are here
├── CLAUDE.md              ← project-level instructions for Claude
├── <skill-name>/
│   ├── SKILL.md           ← required: frontmatter + instructions
│   ├── evals/             ← optional: test prompts + assertions
│   │   └── evals.json
│   ├── scripts/           ← optional: bundled executables
│   ├── references/        ← optional: docs loaded on demand
│   └── assets/            ← optional: templates, fixtures
└── <skill-name>-workspace/ ← eval runs (gitignored or separate)
```

## Contributing a New Skill

1. Create `<skill-name>/SKILL.md` with YAML frontmatter (`name`, `description`) and body instructions. Keep it under ~500 lines.
2. Add 2–3 realistic test prompts to `<skill-name>/evals/evals.json`.
3. Iterate with the `skill-creator` meta-skill: run with-skill vs baseline, grade, aggregate, review. Store runs under `<skill-name>-workspace/iteration-N/`.
4. Add a row to the **Available Skills** table above.

Follow the triggering guidance in `skill-creator` — descriptions should be slightly "pushy" so Claude uses the skill when relevant rather than under-triggering.

## License

See individual skill directories for any skill-specific notes. Repository license applies to the rest.
