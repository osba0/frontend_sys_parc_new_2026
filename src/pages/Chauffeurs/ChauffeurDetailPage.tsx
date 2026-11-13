import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, Car, Clock, AlertTriangle } from "lucide-react";
import { useChauffeur } from "@/hooks";
import type { Chauffeur } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chauffeursApi } from "@/api/operations.api";
import PageHeader from "@/components/shared/PageHeader";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { CardLoading, ErrorState } from "@/components/shared/LoadingPage";
import { ChauffeurAvatarEditable } from "@/components/shared/ChauffeurAvatar";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatKm, mediaUrl } from "@/utils";
import toast from "react-hot-toast";

// ── Tabs ──────────────────────────────────────────────────────
const TABS = [
  { key: "info", label: "Informations", icon: <Edit size={14} /> },
  { key: "historique", label: "Historique", icon: <Clock size={14} /> },
];

// ── Badge statut permis ───────────────────────────────────────
function PermisStatutBadge({
  statut,
  jours,
}: {
  statut: string;
  jours: number | null;
}) {
  const map: Record<string, { cls: string; label: string }> = {
    valide: { cls: "badge-success", label: "Valide" },
    warning: { cls: "badge-warning", label: `Attention — ${jours}j` },
    critique: { cls: "badge-danger", label: `Critique — ${jours}j` },
    expire: { cls: "badge-danger", label: "Expiré" },
    inconnu: { cls: "badge-gray", label: "—" },
  };
  const { cls, label } = map[statut] ?? map.inconnu;
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ── Page ──────────────────────────────────────────────────────
export default function ChauffeurDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasPermission, hasRole } = useAuthStore();
  const chauffeurId = parseInt(id!);

  const [tab, setTab] = useState("info");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

  const {
    data: chauffeur,
    isLoading,
    error,
    refetch,
  } = useChauffeur(chauffeurId);

  // Historique des affectations — chargé quand onglet actif
  const { data: historique, isLoading: lHisto } = useQuery({
    queryKey: ["chauffeur-historique", chauffeurId],
    queryFn: () =>
      chauffeursApi
        .historique(chauffeurId, { per_page: 50, sort: "-date_debut" })
        .then((r) => r.data),
    enabled: tab === "historique",
  });

  // Mutation suspension
  const suspendMut = useMutation({
    mutationFn: () =>
      chauffeursApi.update(chauffeurId, {
        statut: chauffeur?.statut === "suspendu" ? "actif" : "suspendu",
      } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chauffeur", chauffeurId] });
      qc.invalidateQueries({ queryKey: ["chauffeurs"] });
      toast.success(
        chauffeur?.statut === "suspendu"
          ? "Chauffeur réactivé."
          : "Chauffeur suspendu.",
      );
      setSuspendOpen(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  // Mutation suppression
  const deleteMut = useMutation({
    mutationFn: () => chauffeursApi.delete(chauffeurId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chauffeurs"] });
      toast.success("Chauffeur supprimé.");
      navigate("/chauffeurs");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Impossible de supprimer ce chauffeur.",
      ),
  });

  if (isLoading)
    return (
      <div className="card p-6">
        <CardLoading rows={8} />
      </div>
    );
  if (error || !chauffeur)
    return <ErrorState message="Chauffeur non trouvé." onRetry={refetch} />;

  const estActif = chauffeur.statut === "actif";
  const estSuspendu = chauffeur.statut === "suspendu";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Dialogues de confirmation */}
      <ConfirmDialog
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        onConfirm={() => suspendMut.mutate()}
        loading={suspendMut.isPending}
        title={
          estSuspendu ? "Réactiver le chauffeur" : "Suspendre le chauffeur"
        }
        message={
          estSuspendu
            ? `Confirmer la réactivation de ${chauffeur.nom_complet} ?`
            : `Suspendre ${chauffeur.nom_complet} ? Il ne pourra plus être affecté.`
        }
        confirmLabel={estSuspendu ? "Réactiver" : "Suspendre"}
        variant={estSuspendu ? "info" : "warning"}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
        title="Supprimer le chauffeur"
        message={`Supprimer définitivement ${chauffeur.nom_complet} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
      />

      {/* En-tête */}
      <div className="flex items-center gap-4 mb-4">
        <ChauffeurAvatarEditable
          chauffeurId={chauffeur.id}
          photoUrl={chauffeur.photo_profil_url}
          prenom={chauffeur.prenom}
          nom={chauffeur.nom}
          size="xl"
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">
            {chauffeur.nom_complet}
          </h1>
          <p className="text-gray-500 text-sm">
            {chauffeur.agence?.nom ?? ""} ·{" "}
            {chauffeur.matricule_interne ?? "Sans matricule"}
          </p>
        </div>
      </div>
      <PageHeader
        title={chauffeur.nom_complet}
        subtitle={`${chauffeur.agence?.nom ?? ""} · ${chauffeur.matricule_interne ?? "Sans matricule"}`}
        backTo="/chauffeurs"
        actions={
          <div className="flex flex-wrap gap-2">
            {hasPermission("chauffeur.update") && (
              <>
                <button
                  onClick={() => setSuspendOpen(true)}
                  className={`btn-secondary gap-2 ${estSuspendu ? "" : "text-yellow-700 border-yellow-300"}`}
                >
                  <AlertTriangle size={15} />
                  {estSuspendu ? "Réactiver" : "Suspendre"}
                </button>
                <button
                  onClick={() => navigate(`/chauffeurs/${id}/modifier`)}
                  className="btn-primary gap-2"
                >
                  <Edit size={15} /> Modifier
                </button>
              </>
            )}
            {hasRole("super_admin", "directeur") && (
              <button
                onClick={() => setDeleteOpen(true)}
                className="btn-danger gap-2"
              >
                Supprimer
              </button>
            )}
          </div>
        }
      />

      {/* Badges résumé */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`badge ${
            estActif
              ? "badge-success"
              : estSuspendu
                ? "badge-warning"
                : chauffeur.statut === "conge"
                  ? "badge-info"
                  : "badge-gray"
          }`}
        >
          {chauffeur.statut}
        </span>
        <PermisStatutBadge
          statut={chauffeur.statut_permis}
          jours={chauffeur.jours_avant_expiration_permis}
        />
        {/* Badge compte applicatif */}
        {chauffeur.a_un_compte ? (
          <span
            className="badge badge-success"
            title="Peut se connecter à l'application"
          >
            ✓ Compte actif
          </span>
        ) : (
          <span className="badge badge-gray" title="Aucun compte de connexion">
            ○ Sans compte
          </span>
        )}
        {chauffeur.vehicule_actuel && (
          <span
            className="badge badge-info cursor-pointer hover:opacity-80"
            onClick={() =>
              navigate(`/vehicules/${chauffeur.vehicule_actuel!.vehicule_id}`)
            }
            title="Voir le véhicule"
          >
            <Car size={12} className="inline mr-1" />
            {chauffeur.vehicule_actuel.immatriculation}
          </span>
        )}
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-primary-700 text-primary-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Informations ── */}
      {tab === "info" && (
        <div className="space-y-5">
          {/* Véhicule actuel */}
          {chauffeur.vehicule_actuel && (
            <div
              className="card p-5 border-primary-200 bg-primary-50 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() =>
                navigate(`/vehicules/${chauffeur.vehicule_actuel!.vehicule_id}`)
              }
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Car size={22} className="text-primary-700" />
                </div>
                <div>
                  <p className="text-xs text-primary-400 uppercase tracking-wide mb-0.5">
                    Véhicule actuel
                  </p>
                  <p className="text-xl font-bold text-primary-700 font-mono">
                    {chauffeur.vehicule_actuel.immatriculation}
                  </p>
                  <p className="text-sm text-primary-500">
                    {chauffeur.vehicule_actuel.marque_modele}
                    {chauffeur.vehicule_actuel.axe &&
                      ` · Axe : ${chauffeur.vehicule_actuel.axe}`}
                    {" · Depuis "}
                    {formatDate(chauffeur.vehicule_actuel.depuis)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Informations personnelles */}
            <div className="card p-5">
              <h3 className="section-title">Informations personnelles</h3>
              <dl className="space-y-2.5">
                {[
                  ["Nom", chauffeur.nom],
                  ["Prénom", chauffeur.prenom],
                  ["Téléphone", chauffeur.telephone],
                  ["Email", chauffeur.email],
                  ["CNI", chauffeur.cni],
                  ["Adresse", chauffeur.adresse],
                  ["Date naissance", formatDate(chauffeur.date_naissance)],
                  ["Date embauche", formatDate(chauffeur.date_embauche)],
                  ["Matricule", chauffeur.matricule_interne],
                  ["Fonction", chauffeur.fonction],
                  ["Agence", chauffeur.agence?.nom],
                ].map(([label, value]) => (
                  <div
                    key={label as string}
                    className="flex justify-between py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <dt className="text-sm text-gray-500 flex-shrink-0">
                      {label}
                    </dt>
                    <dd className="text-sm font-medium text-gray-900 text-right ml-4 truncate max-w-[180px]">
                      {value ?? "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Permis de conduire */}
            <div className="card p-5">
              <h3 className="section-title">Permis de conduire</h3>
              <dl className="space-y-2.5">
                {[
                  ["N° permis", chauffeur.numero_permis],
                  ["Catégorie", chauffeur.categorie_permis],
                  [
                    "Date délivrance",
                    formatDate(chauffeur.date_delivrance_permis),
                  ],
                  [
                    "Date expiration",
                    formatDate(chauffeur.date_expiration_permis),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label as string}
                    className="flex justify-between py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {value ?? "—"}
                    </dd>
                  </div>
                ))}
                <div className="pt-2">
                  <PermisStatutBadge
                    statut={chauffeur.statut_permis}
                    jours={chauffeur.jours_avant_expiration_permis}
                  />
                  {(chauffeur.statut_permis === "critique" ||
                    chauffeur.statut_permis === "warning") && (
                    <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                      <AlertTriangle size={11} />
                      Renouveler avant le{" "}
                      {formatDate(chauffeur.date_expiration_permis)}
                    </p>
                  )}
                </div>

                {/* Photo du permis */}
                {chauffeur.photo && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                      Scan / Photo du permis
                    </p>
                    {String(chauffeur.photo).toLowerCase().includes(".pdf") ? (
                      <a
                        href={mediaUrl(chauffeur.photo) ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-primary-600 hover:bg-gray-100 transition-colors"
                      >
                        📄 Voir le PDF permis →
                      </a>
                    ) : (
                      <a
                        href={mediaUrl(chauffeur.photo) ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        title="Cliquer pour voir en plein écran"
                      >
                        <img
                          src={mediaUrl(chauffeur.photo) ?? ""}
                          alt="Permis de conduire"
                          className="max-h-48 w-full rounded-xl object-contain border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-zoom-in bg-gray-50"
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      </a>
                    )}
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Compte applicatif */}
          <div
            className={`card p-5 ${chauffeur.a_un_compte ? "" : "border-orange-200 bg-orange-50"}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title mb-0 border-0 pb-0">
                Compte applicatif
              </h3>
              {chauffeur.a_un_compte ? (
                <span className="badge badge-success">✓ Actif</span>
              ) : (
                <span className="badge badge-warning">○ Sans compte</span>
              )}
            </div>

            {chauffeur.a_un_compte ? (
              <dl className="space-y-2">
                {[
                  ["Email de connexion", chauffeur.email],
                  ["Fonction", chauffeur.fonction],
                  ["Rôle", "Chauffeur"],
                ].map(([label, value]) => (
                  <div
                    key={label as string}
                    className="flex justify-between py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd className="text-sm font-medium text-gray-900 text-right">
                      {value ?? "—"}
                    </dd>
                  </div>
                ))}
                <div className="pt-2 flex gap-2">
                  <span className="badge badge-info text-xs">
                    Peut se connecter
                  </span>
                  <span className="badge badge-info text-xs">
                    Soumettre checklists
                  </span>
                  <span className="badge badge-info text-xs">
                    Signaler pannes
                  </span>
                </div>
              </dl>
            ) : (
              <div>
                <p className="text-sm text-orange-700 mb-3">
                  Ce chauffeur n'a pas de compte applicatif. Il ne peut pas se
                  connecter pour soumettre des checklists ou signaler des
                  pannes.
                </p>
                <button
                  onClick={() => navigate(`/chauffeurs/${id}/modifier`)}
                  className="btn-primary btn-sm gap-1.5"
                >
                  + Créer un compte
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          {chauffeur.notes && (
            <div className="card p-5">
              <h3 className="section-title">Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {chauffeur.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Historique des affectations ── */}
      {tab === "historique" && (
        <div className="card p-6">
          {lHisto ? (
            <CardLoading rows={5} />
          ) : !historique?.data || historique.data.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Aucune affectation</p>
              <p className="text-gray-400 text-sm">
                Ce chauffeur n'a jamais été affecté à un véhicule.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {historique.data.map((a: any) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                >
                  {/* Indicateur statut */}
                  <div
                    className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                      a.statut === "active"
                        ? "bg-success"
                        : a.statut === "terminee"
                          ? "bg-gray-300"
                          : "bg-warning"
                    }`}
                  />

                  {/* Véhicule */}
                  <div
                    className="flex-shrink-0 w-28 cursor-pointer"
                    onClick={() => navigate(`/vehicules/${a.vehicule_id}`)}
                  >
                    <span className="font-mono text-primary-700 font-semibold text-sm">
                      {a.vehicule?.immatriculation ?? "—"}
                    </span>
                    {a.vehicule && (
                      <div className="text-xs text-gray-400">
                        {a.vehicule.marque} {a.vehicule.modele}
                      </div>
                    )}
                  </div>

                  {/* Période */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700">
                      {formatDate(a.date_debut)}
                      {" → "}
                      {a.date_fin ? (
                        formatDate(a.date_fin)
                      ) : (
                        <strong className="text-green-600">En cours</strong>
                      )}
                    </div>
                    {a.axe_livraison?.nom && (
                      <div className="text-xs text-gray-400 truncate">
                        {a.axe_livraison.nom}
                      </div>
                    )}
                  </div>

                  {/* Km parcourus */}
                  {a.km_parcourus != null && (
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-sm text-gray-700">
                        {formatKm(a.km_parcourus)}
                      </div>
                      <div className="text-xs text-gray-400">parcourus</div>
                    </div>
                  )}

                  {/* Statut */}
                  <span
                    className={`badge flex-shrink-0 ${
                      a.statut === "active"
                        ? "badge-success"
                        : a.statut === "terminee"
                          ? "badge-gray"
                          : "badge-warning"
                    }`}
                  >
                    {a.statut}
                  </span>
                </div>
              ))}

              {/* Total km */}
              {historique.data.length > 1 && (
                <div className="flex justify-end pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500 mr-2">
                    Total km parcourus :
                  </span>
                  <span className="font-bold text-primary-700 text-sm">
                    {formatKm(
                      historique.data.reduce(
                        (s: number, a: any) =>
                          s + (Number(a.km_parcourus) || 0),
                        0,
                      ),
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
