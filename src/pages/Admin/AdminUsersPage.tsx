import { useState } from 'react'
import {
  Plus, ToggleLeft, ToggleRight,
  Edit2, Key, Trash2, Shield,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axiosInstance'
import PageHeader from '@/components/shared/PageHeader'
import { CardLoading, LoadingSpinner } from '@/components/shared/LoadingPage'
import { useAgences } from '@/hooks'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/utils'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'super_admin',  label: 'Super Admin',   color: 'badge-danger' },
  { value: 'directeur',    label: 'Directeur',     color: 'badge-warning' },
  { value: 'resp_parc',    label: 'Resp. Parc',    color: 'badge-info' },
  { value: 'resp_agence',  label: 'Resp. Agence',  color: 'badge-info' },
  { value: 'comptable',    label: 'Comptable',     color: 'badge-gray' },
  { value: 'chauffeur',    label: 'Chauffeur',     color: 'badge-success' },
  { value: 'attributaire', label: 'Attributaire',  color: 'badge-success' },
]

const roleColor = (role: string) =>
  ROLES.find(r => r.value === role)?.color ?? 'badge-gray'

const roleLabel = (role: string) =>
  ROLES.find(r => r.value === role)?.label ?? role

// ─────────────────────────────────────────────────────────────
// Modal création / édition utilisateur
// ─────────────────────────────────────────────────────────────

function UserModal({
  user,
  onClose,
}: {
  user?: any
  onClose: () => void
}) {
  const qc     = useQueryClient()
  const isEdit = !!user
  const { data: agences = [] } = useAgences()

  const [name,      setName]      = useState(user?.name      ?? '')
  const [prenom,    setPrenom]    = useState(user?.prenom    ?? '')
  const [email,     setEmail]     = useState(user?.email     ?? '')
  const [telephone, setTelephone] = useState(user?.telephone ?? '')
  const [fonction,  setFonction]  = useState(user?.fonction  ?? '')
  const [role,      setRole]      = useState(user?.role      ?? 'chauffeur')
  const [agenceId,  setAgenceId]  = useState(String(user?.agence_id ?? ''))
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [estActif,  setEstActif]  = useState(user?.est_actif ?? true)

  const mut = useMutation({
    mutationFn: () => isEdit
      ? api.put(`/admin/users/${user.id}`, {
          name, prenom, telephone, fonction,
          role, agence_id: agenceId ? parseInt(agenceId) : null,
          est_actif: estActif,
        })
      : api.post('/admin/users', {
          name, prenom, email, telephone, fonction,
          role, agence_id: agenceId ? parseInt(agenceId) : null,
          est_actif: estActif,
          password,
          password_confirmation: password2,
        }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(isEdit ? 'Utilisateur mis à jour.' : 'Utilisateur créé.')
      onClose()
    },
    onError: (err: any) => {
      const msgs = err?.response?.data?.errors
      if (msgs) Object.values(msgs as Record<string, string[]>).forEach(m => toast.error(m[0]))
      else toast.error(err?.response?.data?.message ?? 'Erreur.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEdit && password !== password2) {
      toast.error('Les mots de passe ne correspondent pas.'); return
    }
    if (!isEdit && password.length < 8) {
      toast.error('Mot de passe min. 8 caractères.'); return
    }
    mut.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            <Shield size={18} />
            {isEdit ? `Modifier — ${user.nom_complet ?? user.name}` : 'Nouvel utilisateur'}
          </h3>
          <button onClick={onClose} className="text-primary-200 hover:text-white text-2xl leading-none">✕</button>
        </div>

        <form id="user-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">

          {/* Identité */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom</label>
              <input value={prenom} onChange={e => setPrenom(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="input" required />
            </div>
          </div>

          {/* Email — lecture seule en édition */}
          {!isEdit && (
            <div>
              <label className="label">Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" required />
            </div>
          )}
          {isEdit && (
            <div>
              <label className="label">Email</label>
              <input value={user.email} readOnly className="input bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Téléphone</label>
              <input value={telephone} onChange={e => setTelephone(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Fonction / Poste</label>
              <input value={fonction} onChange={e => setFonction(e.target.value)} className="input"
                placeholder="Directeur, Chef de parc…" />
            </div>
          </div>

          {/* Rôle + Agence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rôle *</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="input" required>
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Agence</label>
              <select value={agenceId} onChange={e => setAgenceId(e.target.value)} className="input">
                <option value="">— Sans agence —</option>
                {agences.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.nom}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mot de passe — création uniquement */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Mot de passe *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="input" autoComplete="new-password" required />
              </div>
              <div>
                <label className="label">Confirmer *</label>
                <input type="password" value={password2} onChange={e => setPassword2(e.target.value)}
                  className="input" autoComplete="new-password" required />
              </div>
            </div>
          )}

          {/* Statut */}
          <div className="flex items-center gap-3 pt-1">
            <input type="checkbox" id="est-actif" checked={estActif}
              onChange={e => setEstActif(e.target.checked)}
              className="w-4 h-4 accent-primary-600" />
            <label htmlFor="est-actif" className="text-sm text-gray-700 cursor-pointer">
              Compte actif
            </label>
          </div>

        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button type="submit" form="user-form" disabled={mut.isPending} className="btn-primary gap-2">
            {mut.isPending
              ? <><LoadingSpinner size="sm" /> Enregistrement…</>
              : isEdit ? 'Mettre à jour' : 'Créer l\'utilisateur'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Modal reset mot de passe
// ─────────────────────────────────────────────────────────────

function ResetPasswordModal({ user, onClose }: { user: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')

  const mut = useMutation({
    mutationFn: () => api.post(`/admin/users/${user.id}/reset-password`, {
      password, password_confirmation: password2,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(`Mot de passe de ${user.name} réinitialisé.`)
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== password2) { toast.error('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8)    { toast.error('Min. 8 caractères.'); return }
    mut.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
          <Key size={16} /> Réinitialiser le mot de passe
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Utilisateur : <strong>{user.nom_complet ?? user.name}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Nouveau mot de passe *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="input" autoComplete="new-password" required />
          </div>
          <div>
            <label className="label">Confirmer *</label>
            <input type="password" value={password2} onChange={e => setPassword2(e.target.value)}
              className="input" autoComplete="new-password" required />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={mut.isPending} className="btn-warning gap-2">
              {mut.isPending ? <LoadingSpinner size="sm" /> : <><Key size={13} /> Réinitialiser</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const qc             = useQueryClient()
  const { user: me }   = useAuthStore()
  const [page,         setPage]         = useState(1)
  const [roleFilter,   setRoleFilter]   = useState('')
  const [agenceFilter, setAgenceFilter] = useState('')
  const [actifFilter,  setActifFilter]  = useState('')
  const [modal,        setModal]        = useState(false)
  const [editUser,     setEditUser]     = useState<any>(null)
  const [resetUser,    setResetUser]    = useState<any>(null)

  const { data: agences = [] } = useAgences()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', { page, roleFilter, agenceFilter, actifFilter }],
    queryFn: () => api.get('/admin/users', {
      params: {
        page, per_page: 20,
        include: 'agence',
        'filter[role]':     roleFilter   || undefined,
        'filter[agence_id]':agenceFilter || undefined,
        'filter[est_actif]':actifFilter  || undefined,
      },
    }).then(r => r.data),
  })

  const toggleMut = useMutation({
    mutationFn: (userId: number) => api.post(`/admin/users/${userId}/toggle-actif`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Statut mis à jour.')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (userId: number) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Utilisateur supprimé.')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur.'),
  })

  const total = data?.meta?.total ?? 0
  const users = data?.data ?? []

  // Stats rapides
  const nbActifs    = users.filter((u: any) =>  u.est_actif).length
  const nbInactifs  = users.filter((u: any) => !u.est_actif).length

  return (
    <div className="space-y-5">

      {/* Modaux */}
      {(modal || editUser) && (
        <UserModal user={editUser ?? undefined} onClose={() => { setModal(false); setEditUser(null) }} />
      )}
      {resetUser && (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
      )}

      <PageHeader
        title="Gestion des utilisateurs"
        subtitle={`${total} utilisateur(s)`}
        actions={
          <button onClick={() => { setEditUser(null); setModal(true) }} className="btn-primary gap-2">
            <Plus size={16} /> Nouvel utilisateur
          </button>
        }
      />

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
          className="input h-8 py-0 text-sm w-40">
          <option value="">Tous les rôles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={agenceFilter} onChange={e => { setAgenceFilter(e.target.value); setPage(1) }}
          className="input h-8 py-0 text-sm w-40">
          <option value="">Toutes agences</option>
          {agences.map((a: any) => <option key={a.id} value={a.id}>{a.nom}</option>)}
        </select>
        <select value={actifFilter} onChange={e => { setActifFilter(e.target.value); setPage(1) }}
          className="input h-8 py-0 text-sm w-32">
          <option value="">Tous statuts</option>
          <option value="1">Actifs</option>
          <option value="0">Inactifs</option>
        </select>
      </div>

      {isLoading ? <CardLoading rows={8} /> : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Agence</th>
                <th>Fonction</th>
                <th>Dernière connexion</th>
                <th>Statut</th>
                <th className="w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : users.map((u: any) => (
                <tr key={u.id} className={!u.est_actif ? 'opacity-60' : ''}>
                  <td>
                    <div className="font-medium text-sm">
                      {u.nom_complet ?? `${u.prenom ?? ''} ${u.name}`.trim()}
                    </div>
                    {u.id === me?.id && (
                      <span className="text-xs text-primary-500 font-medium">· Vous</span>
                    )}
                  </td>
                  <td className="text-sm text-gray-600">{u.email}</td>
                  <td>
                    <span className={`badge text-xs ${roleColor(u.role)}`}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="text-sm">{u.agence?.nom ?? '—'}</td>
                  <td className="text-sm text-gray-500">{u.fonction ?? '—'}</td>
                  <td className="text-xs text-gray-400">
                    {u.last_login_at ? formatDate(u.last_login_at) : 'Jamais'}
                  </td>
                  <td>
                    <button
                      onClick={() => toggleMut.mutate(u.id)}
                      disabled={u.id === me?.id}
                      className="btn-icon"
                      title={u.est_actif ? 'Désactiver' : 'Activer'}
                    >
                      {u.est_actif
                        ? <ToggleRight size={20} className="text-success" />
                        : <ToggleLeft  size={20} className="text-gray-400" />}
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditUser(u)}
                        className="btn-icon text-gray-400 hover:text-primary-600"
                        title="Modifier"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setResetUser(u)}
                        className="btn-icon text-gray-400 hover:text-yellow-600"
                        title="Réinitialiser le mot de passe"
                      >
                        <Key size={14} />
                      </button>
                      {u.id !== me?.id && (
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer ${u.name} ?`)) deleteMut.mutate(u.id)
                          }}
                          className="btn-icon text-gray-400 hover:text-red-500"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {data?.meta && data.meta.last_page > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Page {data.meta.current_page} / {data.meta.last_page}
                {' · '}{total} utilisateur(s)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="btn-secondary btn-sm"
                >← Préc.</button>
                <button
                  disabled={page >= data.meta.last_page}
                  onClick={() => setPage(p => p + 1)}
                  className="btn-secondary btn-sm"
                >Suiv. →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
