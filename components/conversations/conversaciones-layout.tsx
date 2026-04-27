'use client'

import { useState } from 'react'
import { MessageSquare, Settings2 } from 'lucide-react'
import { ConversationsInbox } from './conversations-inbox'
import { AgentConfig } from './agent-config'

type Tab = 'inbox' | 'config'

export function ConversacionesLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('inbox')

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Tab bar */}
      <div className="flex-shrink-0 border-b border-white/[0.08] px-4 flex items-center gap-1 h-10">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'inbox'
              ? 'text-white bg-white/[0.06]'
              : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
          }`}
        >
          <MessageSquare size={12} />
          Bandeja de entrada
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'config'
              ? 'text-white bg-white/[0.06]'
              : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
          }`}
        >
          <Settings2 size={12} />
          Configuración del agente
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'inbox' ? <ConversationsInbox /> : <AgentConfig />}
      </div>
    </div>
  )
}
