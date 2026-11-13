import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ToggleRight,
  ToggleLeft,
  MapPin,
  Route,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axiosInstance";
import PageHeader from "@/components/shared/PageHeader";
import { CardLoading } from "@/components/shared/LoadingPage";
import { LoadingSpinner } from "@/components/shared/LoadingPage";
import { useAgences } from "@/hooks";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface AxeLivraison {
  id: number;
  agence_id: number;
  agence?: { id: number; nom: string; code: string };
  nom: string;
  code: string;
  zone: string | null;
  description: string | null;
  est_actif: boolean;
}

// ─────────────────────────────────────────────────────────────
// Modal Création / Édition
// ─────────────────────────────────────────────────────────────

function AxeModal({
  axe,
  onClose,
}: {
  axe?: AxeLivraison;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!axe;
  const { data: agences = [] } = useAgences();

  const [agenceId, setAgenceId] = useState(String(axe?.agence_id ?? ""));
  const [nom, setNom] = useState(axe?.nom ?? "");
  const [code, setCode] = useState(axe?.code ?? "");
  const [zone, setZone] = useState(axe?.zone ?? "");
  const [description, setDescription] = useState(axe?.description ?? "");
  const [estActif, setEstActif] = useState(axe?.est_actif ?? true);

  const mut = useMutation({
    mutationFn: () =>
      isEdit
        ? api.put(`/admin/axes-livraison/${axe!.id}`, {
            agence_id: parseInt(agenceId),
            nom,
            code,
            zone: zone || null,
            description: description || null,
            est_actif: estActif,
          })
        : api.post("/admin/axes-livraison", {
            agence_id: parseInt(agenceId),
            nom,
            code,
            zone: zone || null,
            description: description || null,
            est_actif: estActif,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["axes-livraison-admin"] });
      qc.invalidateQueries({ queryKey: ["axes-livraison-select"] });
      toast.success(isEdit ? "Axe mis à jour." : "Axe créé.");
      onClose();
    },
    onError: (err: any) => {
      const errors = err?.response?.data?.errors;
      if (errors)
        Object.values(errors as Record<string, string[]>).forEach((m) =>
          toast.error(m[0]),
        );
      else toast.error(err?.response?.data?.message ?? "Erreur.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agenceId) {
      toast.error("Sélectionnez une agence.");
      return;
    }
    if (!nom.trim()) {
      toast.error("Le nom est obligatoire.");
      return;
    }
    if (!code.trim()) {
      toast.error("Le code est obligatoire.");
      return;
    }
    mut.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:rounded-2xl shadow-2xl sm:max-w-lg max-h-[95vh] flex flex-col rounded-t-2xl">
        {/* Header */}
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between sm:rounded-t-2xl rounded-t-2xl flex-shrink-0">
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            <Route size={18} />
            {isEdit ? `Modifier — ${axe!.nom}` : "Nouvel axe de livraison"}
          </h3>
          <button
            onClick={onClose}
            className="text-primary-200 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Formulaire */}
        <form
          id="axe-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 p-6 space-y-4"
        >
          <div>
            <label className="label">Agence *</label>
            <select
              value={agenceId}
              onChange={(e) => setAgenceId(e.target.value)}
              className="input"
              required
            >
              <option value="">— Sélectionner une agence —</option>
              {(agences as any[]).map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nom *</label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="input"
                placeholder="ex : Touba, Kaolack…"
                required
              />
            </div>
            <div>
              <label className="label">Code *</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input"
                placeholder="ex : TBA, KLC…"
                maxLength={20}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Identifiant court unique
              </p>
            </div>
          </div>

          <div>
            <label className="label">Zone géographique</label>
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="input"
              placeholder="ex : Centre, Nord, Sud…"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Informations complémentaires sur cet axe…"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="est-actif"
              checked={estActif}
              onChange={(e) => setEstActif(e.target.checked)}
              className="w-4 h-4 accent-primary-600"
            />
            <label
              htmlFor="est-actif"
              className="text-sm text-gray-700 cursor-pointer"
            >
              Axe actif
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button
            type="submit"
            form="axe-form"
            disabled={mut.isPending}
            className="btn-primary gap-2"
          >
            {mut.isPending ? (
              <>
                <LoadingSpinner size="sm" /> Enregistrement…
              </>
            ) : isEdit ? (
              "Mettre à jour"
            ) : (
              "Créer l'axe"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────

export default function AxesLivraisonPage() {
  const qc = useQueryClient();
  const { data: agences = [] } = useAgences();

  const [modal, setModal] = useState(false);
  const [editAxe, setEditAxe] = useState<AxeLivraison | null>(null);
  const [agenceFilter, setAgenceFilter] = useState("");
  const [actifFilter, setActifFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["axes-livraison-admin", { page, agenceFilter, actifFilter }],
    queryFn: () =>
      api
        .get("/admin/axes-livraison", {
          params: {
            page,
            per_page: 10,
            include: "agence",
            "filter[agence_id]": agenceFilter || undefined,
            "filter[est_actif]": actifFilter || undefined,
          },
        })
        .then((r) => r.data),
  });

  const toggleMut = useMutation({
    mutationFn: (axe: AxeLivraison) =>
      api.put(`/admin/axes-livraison/${axe.id}`, { est_actif: !axe.est_actif }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["axes-livraison-admin"] });
      toast.success("Statut mis à jour.");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/axes-livraison/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["axes-livraison-admin"] });
      qc.invalidateQueries({ queryKey: ["axes-livraison-select"] });
      toast.success("Axe supprimé.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  const axes = (data?.data ?? []) as AxeLivraison[];
  const total = data?.meta?.total ?? 0;
  const nbActifs = data?.meta?.nb_actifs ?? 0;
  const nbInactifs = data?.meta?.nb_inactifs ?? 0;

  return (
    <div className="space-y-5">
      {/* Modaux */}
      {(modal || editAxe) && (
        <AxeModal
          axe={editAxe ?? undefined}
          onClose={() => {
            setModal(false);
            setEditAxe(null);
          }}
        />
      )}

      <PageHeader
        title="Axes de livraison"
        subtitle={`${total} axe(s) configuré(s)`}
        actions={
          <button
            onClick={() => {
              setEditAxe(null);
              setModal(true);
            }}
            className="btn-primary gap-2"
          >
            <Plus size={16} /> Nouvel axe
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total",
            count: total,
            color: "text-primary-700",
            bg: "bg-primary-50 border-primary-200",
          },
          {
            label: "Actifs",
            count: nbActifs,
            color: "text-green-700",
            bg: "bg-green-50 border-green-200",
          },
          {
            label: "Inactifs",
            count: nbInactifs,
            color: "text-gray-500",
            bg: "bg-gray-50 border-gray-200",
          },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`card p-4 border text-center ${bg}`}>
            <div className={`text-2xl font-bold ${color}`}>{count}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <select
          value={agenceFilter}
          onChange={(e) => {
            setAgenceFilter(e.target.value);
            setPage(1);
          }}
          className="input h-8 py-0 text-sm w-44"
        >
          <option value="">Toutes agences</option>
          {(agences as any[]).map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.nom}
            </option>
          ))}
        </select>
        <select
          value={actifFilter}
          onChange={(e) => {
            setActifFilter(e.target.value);
            setPage(1);
          }}
          className="input h-8 py-0 text-sm w-32"
        >
          <option value="">Tous statuts</option>
          <option value="1">Actifs</option>
          <option value="0">Inactifs</option>
        </select>
      </div>

      {/* Tableau */}
      {isLoading ? (
        <CardLoading rows={6} />
      ) : axes.length === 0 ? (
        <div className="card p-12 text-center">
          <MapPin size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Aucun axe de livraison</p>
          <p className="text-gray-400 text-sm mt-1">
            Créez votre premier axe pour commencer.
          </p>
          <button
            onClick={() => setModal(true)}
            className="btn-primary mt-4 gap-2"
          >
            <Plus size={14} /> Créer un axe
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table w-full min-w-[600px]">
              <thead>
                <tr>
                  <th>Axe</th>
                  <th>Code</th>
                  <th>Zone</th>
                  <th>Agence</th>
                  <th>Description</th>
                  <th>Statut</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {axes.map((axe) => (
                  <tr
                    key={axe.id}
                    className={!axe.est_actif ? "opacity-60" : ""}
                  >
                    {/* Nom */}
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <MapPin size={13} className="text-primary-600" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm">
                          {axe.nom}
                        </span>
                      </div>
                    </td>

                    {/* Code */}
                    <td>
                      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {axe.code}
                      </span>
                    </td>

                    {/* Zone */}
                    <td className="text-sm text-gray-500">{axe.zone ?? "—"}</td>

                    {/* Agence */}
                    <td>
                      {axe.agence ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono text-gray-400">
                            {axe.agence.code}
                          </span>
                          <span className="text-sm text-gray-700">
                            {axe.agence.nom}
                          </span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Description */}
                    <td className="text-xs text-gray-400 max-w-[180px]">
                      <span className="truncate block">
                        {axe.description ?? "—"}
                      </span>
                    </td>

                    {/* Statut */}
                    <td>
                      <button
                        onClick={() => toggleMut.mutate(axe)}
                        className="btn-icon"
                        title={axe.est_actif ? "Désactiver" : "Activer"}
                      >
                        {axe.est_actif ? (
                          <ToggleRight size={22} className="text-success" />
                        ) : (
                          <ToggleLeft size={22} className="text-gray-400" />
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditAxe(axe)}
                          className="btn-icon text-gray-400 hover:text-primary-600"
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer l'axe « ${axe.nom} » ?`))
                              deleteMut.mutate(axe.id);
                          }}
                          className="btn-icon text-gray-400 hover:text-red-500"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.meta && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Page {data.meta.current_page} / {data.meta.last_page} · {total}{" "}
                axes
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn-secondary btn-sm"
                >
                  ← Préc.
                </button>
                <button
                  disabled={page >= data.meta.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-secondary btn-sm"
                >
                  Suiv. →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
