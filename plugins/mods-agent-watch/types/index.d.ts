// The engine's AgentStatus, spelled out: a contract may not import.
export type AgentStatus = 'pending' | 'running' | 'waiting' | 'idle' | 'completed' | 'failed' | 'killed'

// One model loop: the main conversation (id 'main') or a subagent / teammate.
export type AgentRow = {
  id: string
  parentId?: string
  type: string
  description: string
  model?: string
  status: AgentStatus | 'main'
  tool?: string // the call running now, e.g. "Read src/Order.cs"
  toolCount: number
  reads: string[]
  writes: string[]
  tokens: number
}

declare module 'claude-code' {
  interface PluginState {
    'mods-agent-watch': { agents: Record<string, AgentRow> }
  }
}
