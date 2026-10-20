# workflow-memory-mods

An optional Claude Code mod that sits beside the
[workflow-memory-claude](https://github.com/hoong2001/workflow-memory-claude) template.
It is not required: the workflow runs the same without it.

| Mod | What it shows | Command |
|---|---|---|
| `mods-plan-status` | Unfinished plans from `project-memory/project-memory-status.md`, oldest first | `/mods-plan-status [show\|hide]` |

## Install

At the prompt of a terminal session:

```
/plugin install mods-plan-status --marketplace hoong2001/workflow-memory-mods
```

Answer `y` to add the marketplace (first time only), then pick a scope — the user scope loads the mod in every project.

From a shell:

```
claude plugin install mods-plan-status --marketplace hoong2001/workflow-memory-mods
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins,
Add marketplace with `hoong2001/workflow-memory-mods`, then Add plugin.

Update later with `claude plugin update mods-plan-status`, then `/reload-plugins`.

## Before installing: remove old copies

Template versions before 13.0.0 shipped `mods-plan-status` inside `.claude/skills/`. A same-named
installed plugin stops that copy loading, so the two fight over one name. Sync the project to
template 13.0.0 or later (`/wp-update-from-master`), which deletes that folder, before you install.

## How it depends on the workflow

`mods-plan-status` reads `project-memory/project-memory-status.md`, which the template's
`.claude/hooks/project-memory-status.mjs` writes. The file is a data contract marked
`<!-- plan-status-table v3 -->`. In a project without that file the pane says so and stays empty;
with a different marker version it shows a warning instead of misread rows.
