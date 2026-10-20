# workflow-memory-mods

Optional Claude Code mods (panes and a toggle band) that sit beside the
[workflow-memory-claude](https://github.com/hoong2001/workflow-memory-claude) template.
Each one installs on its own. None is required: the workflow runs the same without them.

| Mod | What it shows | Command |
|---|---|---|
| `mods-plan-status` | Unfinished plans from `project-memory/project-memory-status.md`, oldest first | `/mods-plan-status [show\|hide]` |
| `mods-context-panel` | Everything `/context` shows, live in a pane | `/mods-context-panel [show\|hide]` |
| `mods-toggle-band` | A row of buttons above the prompt that show / hide the Plans and Context panes | `/mods-toggle-band` |
| `mods-agent-watch` | This session's subagents as a call tree: status, current tool, files read and written, tokens | `/mods-agent-watch [show\|hide]` |

## Install

At the prompt of a terminal session, one line per mod you want:

```
/plugin install mods-plan-status --marketplace hoong2001/workflow-memory-mods
/plugin install mods-context-panel --marketplace hoong2001/workflow-memory-mods
/plugin install mods-toggle-band --marketplace hoong2001/workflow-memory-mods
/plugin install mods-agent-watch --marketplace hoong2001/workflow-memory-mods
```

Answer `y` to add the marketplace (first time only), then pick a scope — the user scope loads the mod in every project.

From a shell:

```
claude plugin install mods-plan-status --marketplace hoong2001/workflow-memory-mods
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins,
Add marketplace with `hoong2001/workflow-memory-mods`, then Add plugin.

Update later with `claude plugin update <mod>`, then `/reload-plugins`.

## Before installing: remove old copies

Template versions before 13.0.0 shipped `mods-plan-status`, `mods-context-panel` and `mods-toggle-band`
inside `.claude/skills/`. A same-named installed plugin stops that copy loading, so the two
fight over one name. Sync the project to template 13.0.0 or later
(`/wp-update-from-master`), which deletes those folders, before you install.

## How the mods depend on each other and on the workflow

- `mods-plan-status` reads `project-memory/project-memory-status.md`, which the template's
  `.claude/hooks/project-memory-status.mjs` writes. The file is a data contract marked
  `<!-- plan-status-table v3 -->`. In a project without that file the pane says so and stays empty;
  with a different marker version it shows a warning instead of misread rows.
- `mods-toggle-band` drives the Plans and Context panes through their `/mods-<name> show|hide`
  commands. A button for a mod that is not installed is drawn off and shows a toast when pressed.
- `mods-agent-watch` opens its pane at every session start; `/mods-agent-watch hide` closes it.
