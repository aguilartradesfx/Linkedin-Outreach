'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Copy, Check, Loader2, Users, Trash2, Shield } from 'lucide-react'
import type { UserWithProfile } from '@/types/user-profiles'
import { PERMISSION_LABELS } from '@/types/user-profiles'

const INPUT =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/60 transition-colors'
const LABEL = 'block text-xs font-medium text-white/50 mb-1.5'

type PermissionKey = keyof typeof PERMISSION_LABELS

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-orange-500' : 'bg-white/10'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getInitials(name: string | null | undefined, email: string) {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return email.slice(0, 2).toUpperCase()
}

// ─── Add User Modal ────────────────────────────────────────────────────────────

interface AddUserModalProps {
  onClose: () => void
  onCreated: (user: UserWithProfile, tempPassword: string) => void
}

function AddUserModal({ onClose, onCreated }: AddUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>({
    can_view_contracts: false,
    can_manage_contracts: false,
    can_view_clients: false,
    can_manage_clients: false,
    can_submit_proposals: true,
    can_view_proposals: false,
    can_view_linkedin: false,
  })

  function setPreset(preset: 'sales' | 'viewer' | 'all') {
    if (preset === 'sales') {
      setPermissions({
        can_view_contracts: false,
        can_manage_contracts: false,
        can_view_clients: false,
        can_manage_clients: false,
        can_submit_proposals: true,
        can_view_proposals: false,
        can_view_linkedin: false,
      })
    } else if (preset === 'viewer') {
      setPermissions({
        can_view_contracts: true,
        can_manage_contracts: false,
        can_view_clients: true,
        can_manage_clients: false,
        can_submit_proposals: true,
        can_view_proposals: true,
        can_view_linkedin: true,
      })
    } else {
      const all = {} as Record<PermissionKey, boolean>
      ;(Object.keys(PERMISSION_LABELS) as PermissionKey[]).forEach((k) => (all[k] = true))
      setPermissions(all)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('El email es requerido'); return }
    setLoading(true)
    setError(null)

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), full_name: fullName.trim() || null, permissions }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al crear usuario'); setLoading(false); return }

    onCreated(
      { id: data.id, email: data.email, created_at: new Date().toISOString(), profile: null },
      data.tempPassword,
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#111111] border border-white/[0.1] rounded-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">Agregar usuario</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 p-1 transition-colors">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Nombre completo</label>
              <input className={INPUT} placeholder="Juan Pérez" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Email <span className="text-orange-400">*</span></label>
              <input type="email" className={INPUT} placeholder="juan@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={LABEL + ' mb-0'}>Permisos</label>
              <div className="flex gap-1">
                {(['sales', 'viewer', 'all'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreset(p)}
                    className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-white/40 hover:text-white/70 hover:border-white/25 transition-colors"
                  >
                    {p === 'sales' ? 'Vendedor' : p === 'viewer' ? 'Viewer' : 'Todo'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              {(Object.entries(PERMISSION_LABELS) as [PermissionKey, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-white/60">{label}</span>
                  <Toggle
                    checked={permissions[key]}
                    onChange={(v) => setPermissions((prev) => ({ ...prev, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-white/40 hover:text-white/70 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Password Reveal Modal ─────────────────────────────────────────────────────

function PasswordModal({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" />
      <div className="relative bg-[#111111] border border-emerald-500/30 rounded-xl w-full max-w-sm p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
          <Shield size={18} className="text-emerald-400" />
        </div>
        <h2 className="text-base font-semibold text-white mb-1">Usuario creado</h2>
        <p className="text-xs text-white/40 mb-4">
          Comparte esta contraseña temporal con <span className="text-white/70">{email}</span>.<br />
          No volverá a mostrarse.
        </p>
        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 mb-4">
          <code className="flex-1 text-sm font-mono text-emerald-300 text-left break-all">{password}</code>
          <button onClick={copy} className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0">
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 text-sm font-medium rounded-lg transition-colors"
        >
          Entendido, ya copié la contraseña
        </button>
      </div>
    </div>
  )
}

// ─── Permissions row (inline edit) ────────────────────────────────────────────

function UserPermissionsRow({ user, onUpdated, onDeleted }: {
  user: UserWithProfile
  onUpdated: (u: UserWithProfile) => void
  onDeleted: (id: string) => void
}) {
  const profile = user.profile
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function togglePermission(key: PermissionKey, value: boolean) {
    setSaving(true)
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    if (res.ok) {
      const updated = await res.json()
      onUpdated({ ...user, profile: updated })
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar al usuario ${user.email}? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) onDeleted(user.id)
    else setDeleting(false)
  }

  const initials = getInitials(profile?.full_name, user.email ?? '')

  return (
    <>
      <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-orange-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-semibold text-orange-400">{initials}</span>
            </div>
            <div>
              <p className="text-sm text-white font-medium">{profile?.full_name ?? '—'}</p>
              <p className="text-xs text-white/40">{user.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          {profile?.is_admin ? (
            <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full">Admin</span>
          ) : (
            <span className="text-xs text-white/30">Estándar</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-white/30">{formatDate(user.created_at)}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-orange-400/70 hover:text-orange-400 transition-colors"
            >
              {expanded ? 'Ocultar' : 'Permisos'}
            </button>
            {saving && <Loader2 size={12} className="animate-spin text-white/30" />}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-50"
              title="Eliminar usuario"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && profile && (
        <tr className="border-b border-white/[0.04]">
          <td colSpan={4} className="px-4 pb-3 pt-0">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.entries(PERMISSION_LABELS) as [PermissionKey, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-white/50">{label}</span>
                  <Toggle
                    checked={!!profile[key as keyof typeof profile]}
                    onChange={(v) => togglePermission(key, v)}
                    disabled={saving}
                  />
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

type FetchState = 'loading' | 'ok' | 'forbidden' | 'error'

export function UserManagement() {
  const [users, setUsers] = useState<UserWithProfile[]>([])
  const [fetchState, setFetchState] = useState<FetchState>('loading')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string } | null>(null)

  const fetchUsers = useCallback(async () => {
    setFetchState('loading')
    try {
      const res = await fetch('/api/users')
      if (res.status === 403) { setFetchState('forbidden'); return }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setFetchError(body.error ?? `Error ${res.status}`)
        setFetchState('error')
        return
      }
      setUsers(await res.json())
      setFetchState('ok')
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Error de red')
      setFetchState('error')
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  function handleCreated(user: UserWithProfile, tempPassword: string) {
    setUsers((prev) => [user, ...prev])
    setShowModal(false)
    setCreatedUser({ email: user.email, password: tempPassword })
    fetchUsers()
  }

  function handleUpdated(updated: UserWithProfile) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, profile: updated.profile } : u)))
  }

  function handleDeleted(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  const centered = 'fixed inset-0 md:left-56 flex flex-col items-center justify-center text-center px-4'

  if (fetchState === 'loading') {
    return (
      <div className={centered}>
        <Loader2 size={20} className="animate-spin text-white/20 mb-3" />
        <p className="text-white/30 text-sm">Cargando...</p>
      </div>
    )
  }

  if (fetchState === 'forbidden') {
    return (
      <div className={centered}>
        <Shield size={32} className="text-white/10 mb-3" />
        <p className="text-white/30 text-sm">No tienes permisos para gestionar usuarios.</p>
      </div>
    )
  }

  if (fetchState === 'error') {
    return (
      <div className={centered}>
        <Shield size={32} className="text-red-500/20 mb-3" />
        <p className="text-white/50 text-sm mb-1">Error al cargar usuarios</p>
        <p className="text-white/25 text-xs mb-4">{fetchError}</p>
        <button
          onClick={fetchUsers}
          className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Usuarios</h1>
          <p className="text-sm text-white/40 mt-0.5">{users.length} usuario(s) registrado(s)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} />
          Agregar usuario
        </button>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Users size={32} className="text-white/10 mb-3" />
          <p className="text-white/30 text-sm">No hay usuarios registrados</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead className="bg-white/[0.03] border-b border-white/[0.06]">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Usuario</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Rol</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Creado</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserPermissionsRow
                  key={u.id}
                  user={u}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddUserModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {createdUser && (
        <PasswordModal
          email={createdUser.email}
          password={createdUser.password}
          onClose={() => setCreatedUser(null)}
        />
      )}
    </div>
  )
}
