'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Save, Bot, User, Loader2, RotateCcw, Send, CheckCheck } from 'lucide-react'

interface TestMessage {
  role: 'user' | 'assistant'
  content: string
}

export function AgentConfig() {
  const [prompt, setPrompt] = useState('')
  const [savedPrompt, setSavedPrompt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [testMessages, setTestMessages] = useState<TestMessage[]>([])
  const [testInput, setTestInput] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/agent/config')
      .then(r => r.json())
      .then(data => {
        setPrompt(data.prompt ?? '')
        setSavedPrompt(data.prompt ?? '')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [testMessages, testLoading])

  const isDirty = prompt !== savedPrompt

  const handleSave = async () => {
    if (!isDirty || saving) return
    setSaving(true)
    const res = await fetch('/api/agent/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    if (res.ok) {
      setSavedPrompt(prompt)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    }
    setSaving(false)
  }

  const handleSendTest = useCallback(async () => {
    if (!testInput.trim() || testLoading) return

    const userMsg: TestMessage = { role: 'user', content: testInput.trim() }
    const updatedHistory = [...testMessages, userMsg]
    setTestMessages(updatedHistory)
    setTestInput('')
    setTestLoading(true)

    try {
      const res = await fetch('/api/agent/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          systemPrompt: prompt,
          history: testMessages,
        }),
      })
      const data = await res.json()
      setTestMessages(prev => [...prev, { role: 'assistant', content: data.response ?? 'Error al obtener respuesta.' }])
    } catch {
      setTestMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexión. Intenta de nuevo.' }])
    } finally {
      setTestLoading(false)
    }
  }, [testInput, testLoading, testMessages, prompt])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendTest()
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left panel: prompt editor ──────────────────────────────────── */}
      <div className="w-1/2 border-r border-white/[0.08] flex flex-col min-h-0">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">System Prompt</h2>
            <p className="text-xs text-white/40 mt-0.5">Instrucciones del agente de LinkedIn</p>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <button
                onClick={() => setPrompt(savedPrompt)}
                className="flex items-center gap-1 text-xs text-white/35 hover:text-white/60 transition-colors px-2 py-1 rounded"
              >
                <RotateCcw size={11} />
                Descartar
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-orange-500 hover:bg-orange-400 text-white"
            >
              {saving ? (
                <Loader2 size={11} className="animate-spin" />
              ) : saveSuccess ? (
                <CheckCheck size={11} />
              ) : (
                <Save size={11} />
              )}
              {saveSuccess ? '¡Guardado!' : 'Guardar'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={16} className="animate-spin text-white/30" />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            spellCheck={false}
            className="flex-1 min-h-0 bg-transparent text-sm text-white/80 font-mono resize-none focus:outline-none px-5 py-4 leading-relaxed"
          />
        )}

        {isDirty && !loading && (
          <div className="px-5 py-2 border-t border-white/[0.06] flex-shrink-0">
            <p className="text-[11px] text-orange-400/60">
              Cambios sin guardar · el agente real usa el prompt guardado
            </p>
          </div>
        )}
      </div>

      {/* ── Right panel: test chat ──────────────────────────────────────── */}
      <div className="w-1/2 flex flex-col min-h-0 bg-[#0a0a0a]">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">Probar conversación</h2>
            <p className="text-xs mt-0.5">
              {isDirty
                ? <span className="text-orange-400/60">Usando prompt con cambios sin guardar</span>
                : <span className="text-white/30">Usando prompt guardado</span>
              }
            </p>
          </div>
          {testMessages.length > 0 && (
            <button
              onClick={() => setTestMessages([])}
              className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded"
            >
              <RotateCcw size={11} />
              Limpiar
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {testMessages.length === 0 && !testLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot size={28} className="text-white/10 mb-3" />
              <p className="text-sm text-white/30">Escribe un mensaje para probar el agente</p>
              <p className="text-xs text-white/20 mt-1">Simula cómo respondería a un prospecto</p>
            </div>
          ) : (
            testMessages.map((msg, i) => {
              const isAgent = msg.role === 'assistant'
              return (
                <div key={i} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                  {!isAgent && (
                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mr-2 flex-shrink-0 self-end mb-1">
                      <User size={10} className="text-white/40" />
                    </div>
                  )}
                  <div>
                    {isAgent && (
                      <div className="flex items-center gap-1 justify-end mb-1">
                        <Bot size={10} className="text-orange-400/60" />
                        <span className="text-[10px] text-orange-400/60">Agente</span>
                      </div>
                    )}
                    {!isAgent && (
                      <p className="text-[10px] text-white/30 mb-1 ml-0.5">Prospecto</p>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isAgent
                        ? 'bg-orange-500/15 border border-orange-500/20 rounded-tr-sm'
                        : 'bg-white/[0.06] border border-white/[0.08] rounded-tl-sm'
                    }`}>
                      <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                  {isAgent && (
                    <div className="w-6 h-6 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center ml-2 flex-shrink-0 self-end mb-1">
                      <Bot size={10} className="text-orange-400" />
                    </div>
                  )}
                </div>
              )
            })
          )}

          {testLoading && (
            <div className="flex justify-end">
              <div className="bg-orange-500/10 border border-orange-500/15 rounded-2xl rounded-tr-sm px-4 py-3 mr-8">
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-orange-400/50 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/[0.06] flex-shrink-0">
          <div className="flex gap-2">
            <input
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Simula un mensaje del prospecto..."
              disabled={testLoading || loading}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-orange-500/50 disabled:opacity-40 transition-colors"
            />
            <button
              onClick={handleSendTest}
              disabled={testLoading || !testInput.trim() || loading}
              className="px-3 py-2 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/25 rounded-lg text-orange-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
