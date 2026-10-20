import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AgentRow } from '../types'

const PANE = 'mods-agent-watch'
const MAIN = 'main'
const KEEP = 50 // ponytail: last 50 files per agent; raise it if long runs need the full list
const READ_TOOLS = ['Read']
const WRITE_TOOLS = ['Edit', 'Write', 'NotebookEdit']
const ICON: Record<AgentRow['status'], string> = {
  main: '◆', pending: '…', running: '●', waiting: '◐', idle: '○', completed: '✓', failed: '✗', killed: '■',
}
const COLOR: Partial<Record<AgentRow['status'], string>> = {
  running: 'warning', waiting: 'warning', completed: 'success', failed: 'error', killed: 'error',
}

const agents = atom({ plugin: 'mods-agent-watch', key: 'agents' } as const, {})

function blank(id: string): AgentRow {
  return {
    id,
    type: id === MAIN ? 'main' : '?',
    description: id === MAIN ? 'this conversation' : '',
    status: id === MAIN ? 'main' : 'running',
    toolCount: 0,
    reads: [],
    writes: [],
    tokens: 0,
  }
}

function patch($: EngineInterface, id: string, fn: (row: AgentRow) => AgentRow) {
  return update($, agents, all => ({ ...all, [id]: fn(all[id] ?? blank(id)) }))
}

function remember(list: string[], file: string) {
  return [...list.filter(f => f !== file), file].slice(-KEEP)
}

function fileOf(args: Record<string, unknown>) {
  const path = args.file_path ?? args.notebook_path
  return typeof path === 'string' ? path : undefined
}

function labelOf(tool: string, args: Record<string, unknown>) {
  const arg = fileOf(args) ?? args.command ?? args.pattern ?? args.description ?? args.url
  return typeof arg === 'string' ? `${tool} ${(arg.split('\n')[0] ?? '').slice(0, 120)}` : tool
}

function short(path: string) {
  return path.split(/[\\/]/).slice(-2).join('/')
}

function tok(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k tok` : `${n} tok`
}

// Statuses come from the engine's own list; only a change is written, so the pane redraws on change alone.
async function sync($: EngineInterface) {
  const list = await $.agent.list().catch(() => [])
  const all = await read($, agents)
  const changed = list.filter(a => all[a.id]?.status !== a.status)
  if (changed.length === 0) return
  await update($, agents, cur => {
    const out = { ...cur }
    for (const a of changed) {
      out[a.id] = {
        ...(cur[a.id] ?? blank(a.id)),
        parentId: a.parentId ?? MAIN,
        type: a.type,
        description: a.description,
        status: a.status,
      }
    }
    return out
  })
}

async function setShown($: EngineInterface, shown: boolean) {
  if (shown) await $.ui.open({ id: PANE, title: 'Agents' })
  else await $.ui.close({ id: PANE })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'mods-agent-watch',
      description: 'Show or hide the live subagent pane',
      argumentHint: '[show|hide]',
    })
    $.clock.every(2000, () => void sync($))
    void setShown($, true) // open at every session start, by design
    return next(e)
  })

  on('command.run', { command: 'mods-agent-watch' }, async ($, e) => {
    const shown = e.args.trim() !== 'hide'
    await setShown($, shown)
    return { text: shown ? 'Agent pane shown.' : 'Agent pane hidden.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)
    if (spawned.agentId) {
      await patch($, spawned.agentId, row => ({
        ...row,
        parentId: e.parentAgentId ?? MAIN,
        type: e.subagentType,
        description: e.description ?? '',
        model: spawned.model,
        status: 'running',
      }))
    }
    return spawned
  }).catch(($, e, next) => next(e)) // an observer: its own failure never refuses the spawn

  // Reads and writes are counted once the call answered without error: a denied Edit wrote nothing.
  on('tool.call', async ($, e, next) => {
    const args = e as unknown as Record<string, unknown>
    const id = e.agentId ?? MAIN
    const label = labelOf(e.tool, args)
    await patch($, id, row => ({ ...row, tool: label, toolCount: row.toolCount + 1 }))
    const ran = await next(e)
    const file = fileOf(args)
    const isOk = !ran.deny && !ran.isError
    await patch($, id, row => ({
      ...row,
      tool: row.tool === label ? undefined : row.tool,
      reads: isOk && file && READ_TOOLS.includes(e.tool) ? remember(row.reads, file) : row.reads,
      writes: isOk && file && WRITE_TOOLS.includes(e.tool) ? remember(row.writes, file) : row.writes,
    }))
    return ran
  }).catch(($, e, next) => next(e)) // an observer: its own failure never refuses the call

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    const used = u ? u.input_tokens + u.output_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens : 0
    const id = e.agentId ?? MAIN
    await patch($, id, row => ({
      ...row,
      tokens: row.tokens + used,
      tool: undefined,
      // a subagent's turn is its run; the next sync corrects a teammate that only went idle
      status: id === MAIN ? row.status : e.isAborted ? 'killed' : 'completed',
    }))
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const all = await read($, agents)
    const rows = Object.values(all).filter(r => r.id !== MAIN)
    // a parent the pane never saw (a workflow's loop) hangs its children under main
    const parentOf = (r: AgentRow) => (r.parentId && all[r.parentId] ? r.parentId : MAIN)

    const drawn: JSX.Element[] = []
    const walk = (row: AgentRow, depth: number) => {
      drawn.push(
        <Box flexDirection="column" marginLeft={depth * 2} marginTop={depth === 0 ? 0 : 1}>
          <Box>
            <Text color={COLOR[row.status]}>{ICON[row.status]} </Text>
            <Text bold>{row.type}</Text>
            <Text wrap="truncate-end"> · {row.description} </Text>
            {row.id === MAIN ? null : (
              <Button key={row.id} label="view" onPress={() => $.ui.view({ agentId: row.id })} />
            )}
          </Box>
          <Text dimColor wrap="truncate-end">
            {row.tool ?? row.status} · {row.toolCount} calls · R{row.reads.length} W{row.writes.length} · {tok(row.tokens)}
            {row.model ? ` · ${row.model}` : ''}
          </Text>
          {row.writes.slice(-5).map(f => (
            <Text color="diffAdded" wrap="truncate-end">  W {short(f)}</Text>
          ))}
          {row.reads.slice(-3).map(f => (
            <Text dimColor wrap="truncate-end">  R {short(f)}</Text>
          ))}
        </Box>,
      )
      for (const child of rows.filter(c => parentOf(c) === row.id)) walk(child, depth + 1)
    }
    walk(all[MAIN] ?? blank(MAIN), 0)

    return (
      <Box flexDirection="column">
        {rows.length === 0 ? <Text dimColor>No subagents yet.</Text> : null}
        {drawn}
      </Box>
    )
  })
}
