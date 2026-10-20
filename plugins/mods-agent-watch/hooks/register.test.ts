import { expect, test } from 'claude-code/testing'

const PROPS = {
  title: 'Agents',
  isFocused: false,
  bodyColumns: 60,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
} as const

for (const surface of ['terminal', 'desktop'] as const) {
  test(`pane draws a spawned subagent under main with the file it wrote, not the one it was denied, on ${surface}`, async ($, on) => {
    on('agent.spawn', () => ({ model: 'haiku', agentId: 'a1' }))
    on('tool.call', ($, e) => ('file_path' in e && e.file_path === 'src/Denied.cs' ? { deny: 'no' } : { result: 'ok' }))

    // the engine fills the rest of a spawn and pins agentId on a subagent's calls; a test raises them as given
    await $.agent.spawn({ prompt: 'scan', description: 'scan repo', subagentType: 'Explore' } as never)
    await $.tool.call({ tool: 'Write', file_path: 'src/app/Order.cs', content: 'x', agentId: 'a1' } as never)
    await $.tool.call({ tool: 'Write', file_path: 'src/Denied.cs', content: 'x', agentId: 'a1' } as never)
    await $.tool.call({ tool: 'Read', file_path: 'README.md' })

    const pane = await $.ui.mount({ plugin: 'mods-agent-watch', surface, component: 'Pane', requestId: 'mods-agent-watch', props: PROPS })
    expect(await pane.find({ text: /Explore/ })).toBeDefined()
    expect(await pane.find({ text: /scan repo/ })).toBeDefined()
    expect(await pane.find({ text: /W app\/Order\.cs/ })).toBeDefined()
    expect(await pane.find({ text: /Denied/ })).toBeUndefined()
    expect(await pane.find({ text: /R README\.md/ })).toBeDefined() // main's own read
  })
}
