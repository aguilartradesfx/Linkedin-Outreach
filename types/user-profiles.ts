export interface UserProfile {
  id: string
  full_name: string | null
  role: string
  is_admin: boolean
  can_view_contracts: boolean
  can_manage_contracts: boolean
  can_view_clients: boolean
  can_manage_clients: boolean
  can_submit_proposals: boolean
  can_view_proposals: boolean
  can_view_linkedin: boolean
  created_at: string
  updated_at: string
  // Joined from auth.users
  email?: string
}

export interface UserWithProfile {
  id: string
  email: string
  created_at: string
  profile: UserProfile | null
}

export const PERMISSION_LABELS: Record<keyof Omit<UserProfile, 'id' | 'full_name' | 'role' | 'is_admin' | 'created_at' | 'updated_at' | 'email'>, string> = {
  can_view_contracts:   'Ver contratos',
  can_manage_contracts: 'Crear / editar contratos',
  can_view_clients:     'Ver clientes',
  can_manage_clients:   'Administrar clientes',
  can_submit_proposals: 'Enviar solicitudes',
  can_view_proposals:   'Ver solicitudes',
  can_view_linkedin:    'Ver LinkedIn Pipeline',
}
