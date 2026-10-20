import { expect, test } from 'claude-code/testing'

import { TABLE_FORMAT } from './parse'

const md = [
  '## Live work — 1 plan(s) not Done',
  '',
  TABLE_FORMAT,
  '',
  '| Module | Plan | Status | Detail | You now | Next | Updated |',
  '|---|---|---|---|---|---|---|',
  '| sales-module | [sales-module-2026-10-01-orders-export.md](x) | Building | 2/5 | test task 2 | task 3 | 2026-10-01 |',
].join('\n')

for (const surface of ['terminal', 'desktop'] as const) {
  test(`pane starts hidden, and /mods-plan-status show|hide opens it with the plans and closes it on ${surface}`, async ($, on) => {
    const open = new Set<string>()
    on('session.root', () => ({ value: '/proj' }))
    on('fs.read', () => ({ value: md }))
    on('ui.open', ($, e) => {
      open.add(e.id)
      return { value: { isPlaced: true } }
    })
    on('ui.close', ($, e) => {
      open.delete(e.id)
      return { value: undefined }
    })
    on('ui.panes', () => ({
      value: [...open].map(id => ({ id, title: id, isShown: true, isFocused: false, isPlaced: true })),
    }))
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    const filled: string[] = []
    on('prompt.fill', ($, e) => {
      filled.push(e.text)
      return { isFilled: true, text: e.text, cursor: e.text.length }
    })
    await $.turn.start({ text: 'hi', turnId: 't1' }) // isShown is false and no pane is up, so nothing opens
    expect(open.has('mods-plan-status')).toBe(false)
    await $.command.run({ command: 'mods-plan-status', args: 'show' })
    expect(open.has('mods-plan-status')).toBe(true)

    const pane = await $.ui.mount({
      plugin: 'mods-plan-status',
      surface,
      component: 'Pane',
      requestId: 'mods-plan-status',
      props: {
        title: 'Plans',
        isFocused: false,
        bodyColumns: 40,
        placement: 'dock',
        scroll: { offset: 0, bodyRows: 20 },
        view: {},
      },
    })
    expect(await pane.find({ text: /1 live plan/ })).toBeDefined()
    expect(await pane.find({ text: '1. ' })).toBeDefined()
    expect(await pane.find({ text: 'sales-module-2026-10-01-orders-export.md' })).toBeDefined() // the full plan name
    expect(await pane.find({ key: 'project-memory/x' })).toBeDefined() // the [ @ ] button before a plan with a path    expect(await pane.find({ text: /•/ })).toBeDefined()
    expect(await pane.find({ text: /You now: test task 2/ })).toBeDefined()
    expect(await pane.find({ text: /Next: task 3/ })).toBeDefined()

    // pressing the plan name puts its path, @-prefixed, in the prompt box
    await pane.press({ key: 'project-memory/x' })
    expect(filled).toEqual(['@project-memory/x '])

    await $.command.run({ command: 'mods-plan-status', args: 'hide' })
    expect(open.has('mods-plan-status')).toBe(false)
    await $.command.run({ command: 'mods-plan-status', args: 'show' })
    expect(open.has('mods-plan-status')).toBe(true)

    // /clear or /resume left isShown true but the pane gone: the next main-loop turn reopens it
    open.delete('mods-plan-status')
    await $.turn.start({ text: 'hi', turnId: 't2', agentId: 'sub-1' }) // a subagent's turn changes nothing
    expect(open.has('mods-plan-status')).toBe(false)
    await $.turn.start({ text: 'hi', turnId: 't3' })
    expect(open.has('mods-plan-status')).toBe(true)
  })
}
