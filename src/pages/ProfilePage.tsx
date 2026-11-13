import { useAuthStore } from '@/stores/authStore'
import PageHeader from '@/components/shared/PageHeader'
import { formatDate } from '@/utils'

export default function ProfilePage() {
  const { user } = useAuthStore()
  if (!user) return null

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Mon profil" backTo="/dashboard" />
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary-700 flex items-center justify-center text-white text-2xl font-bold">
            {user.prenom?.[0]}{user.name[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.nom_complet}</h2>
            <p className="text-gray-500 text-sm capitalize">{user.role?.replace(/_/g, ' ')}</p>
            <p className="text-gray-400 text-xs">{user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Agence',        user.agence?.nom ?? '—'],
            ['Fonction',      user.fonction ?? '—'],
            ['Téléphone',     user.telephone ?? '—'],
            ['Dernière connexion', formatDate(user.last_login_at)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</dt>
              <dd className="text-sm font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
