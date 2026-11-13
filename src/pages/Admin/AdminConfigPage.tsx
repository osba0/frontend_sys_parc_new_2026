import { useState, useRef, useEffect } from "react";
import {
  Settings,
  Database,
  Bell,
  Shield,
  Building2,
  ChevronRight,
  Upload,
  Save,
  Play,
  Lock,
  Unlock,
  Check,
  X,
  RotateCcw,
  Users,
} from "lucide-react";
import { rolesApi, type RoleSummary, type ModuleGroup } from "@/api/roles.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axiosInstance";
import PageHeader from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingPage";
import { useAuthStore } from "@/stores/authStore";
import { useConfigStore } from "@/stores/configStore";
import { formatDate } from "@/utils";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────

export default function AdminConfigPage() {
  const { user } = useAuthStore();
  const { config, setConfig } = useConfigStore();
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState("entreprise");
  const fileRef = useRef<HTMLInputElement>(null);

  // Champs formulaire entreprise
  const [nom, setNom] = useState(config?.nom ?? "");
  const [ninea, setNinea] = useState(config?.ninea ?? "");
  const [rc, setRc] = useState(config?.rc ?? "");
  const [adresse, setAdresse] = useState(config?.adresse ?? "");
  const [telephone, setTelephone] = useState(config?.telephone ?? "");
  const [email, setEmail] = useState(config?.email ?? "");
  const [siteWeb, setSiteWeb] = useState(config?.site_web ?? "");
  const [couleur1, setCouleur1] = useState(config?.couleur_1 ?? "#1E3A5F");
  const [couleur2, setCouleur2] = useState(config?.couleur_2 ?? "#2E86C1");
  const [couleur3, setCouleur3] = useState(config?.couleur_3 ?? "#1ABC9C");
  const [notes, setNotes] = useState(config?.notes ?? "");
  const [chauffeurPeutSaisirCarburant, setChauffeurPeutSaisirCarburant] =
    useState(config?.chauffeur_peut_saisir_carburant ?? false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    config?.logo_url ?? null,
  );

  // Stats système
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () =>
      api
        .get("/admin/stats")
        .then((r) => r.data.data)
        .catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const saveMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      if (nom) fd.append("nom", nom);
      if (ninea) fd.append("ninea", ninea);
      if (rc) fd.append("rc", rc);
      if (adresse) fd.append("adresse", adresse);
      if (telephone) fd.append("telephone", telephone);
      if (email) fd.append("email", email);
      if (siteWeb) fd.append("site_web", siteWeb);
      fd.append("couleur_1", couleur1);
      fd.append("couleur_2", couleur2);
      fd.append("couleur_3", couleur3);
      if (notes) fd.append("notes", notes);
      fd.append(
        "chauffeur_peut_saisir_carburant",
        chauffeurPeutSaisirCarburant ? "1" : "0",
      );
      if (logoFile) fd.append("logo", logoFile, logoFile.name);
      return api.post("/admin/config", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (res) => {
      const d = res.data.data;
      setConfig({ ...config!, ...d });
      qc.invalidateQueries({ queryKey: ["admin-config"] });
      toast.success("Configuration sauvegardée.");
      setLogoFile(null);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  const sections = [
    { key: "entreprise", label: "Entreprise", icon: <Building2 size={16} /> },
    { key: "systeme", label: "Système", icon: <Settings size={16} /> },
    { key: "taches", label: "Tâches système", icon: <Play size={16} /> },
    { key: "alertes", label: "Seuils & Alertes", icon: <Bell size={16} /> },
    {
      key: "permissions",
      label: "RBAC & Permissions",
      icon: <Shield size={16} />,
    },
    { key: "agences", label: "Agences", icon: <Building2 size={16} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Configuration système" subtitle="Paramètres globaux" />

      <div className="grid grid-cols-12 gap-5">
        {/* Menu latéral sections */}
        <div className="col-span-3">
          <div className="card overflow-hidden">
            {sections.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm border-b border-gray-50 last:border-0 transition-colors ${
                  activeSection === s.key
                    ? "bg-primary-50 text-primary-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {s.icon} {s.label}
                </div>
                <ChevronRight size={14} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Contenu section */}
        <div className="col-span-9 space-y-4">
          {/* ── Entreprise ── */}
          {activeSection === "entreprise" && (
            <div className="card p-6 space-y-5">
              <h3 className="section-title flex items-center gap-2">
                <Building2 size={15} /> Informations de l'entreprise
              </h3>

              {/* Logo entreprise */}
              <div className="flex items-center gap-5">
                <div
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary-400 transition-colors bg-gray-50"
                  onClick={() => fileRef.current?.click()}
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-center">
                      <Upload
                        size={20}
                        className="mx-auto text-gray-300 mb-1"
                      />
                      <p className="text-xs text-gray-400">Logo</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.svg,.webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Logo de l'entreprise
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    PNG · SVG · JPG · max 2 Mo
                  </p>
                  <p className="text-xs text-gray-400">
                    Affiché dans le Topbar et les PDFs
                  </p>
                  {logoFile && (
                    <p className="text-xs text-primary-600 mt-1 font-medium">
                      ✓ {logoFile.name}
                    </p>
                  )}
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                      }}
                      className="text-xs text-red-500 hover:underline mt-1 block"
                    >
                      Supprimer le logo
                    </button>
                  )}
                </div>
              </div>

              {/* Champs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nom de l'entreprise *</label>
                  <input
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="input"
                    placeholder="Société de Transport..."
                  />
                </div>
                <div>
                  <label className="label">NINEA</label>
                  <input
                    value={ninea}
                    onChange={(e) => setNinea(e.target.value)}
                    className="input"
                    placeholder="123 456 789 2B3"
                  />
                </div>
                <div>
                  <label className="label">Registre du Commerce (RC)</label>
                  <input
                    value={rc}
                    onChange={(e) => setRc(e.target.value)}
                    className="input"
                    placeholder="SN-DKR-2020-B-12345"
                  />
                </div>
                <div>
                  <label className="label">Téléphone</label>
                  <input
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="input"
                    placeholder="+221 33 xxx xx xx"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="contact@entreprise.sn"
                  />
                </div>
                <div>
                  <label className="label">Site web</label>
                  <input
                    value={siteWeb}
                    onChange={(e) => setSiteWeb(e.target.value)}
                    className="input"
                    placeholder="https://entreprise.sn"
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Adresse</label>
                  <input
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    className="input"
                    placeholder="123, rue des Almadies, Dakar"
                  />
                </div>
              </div>

              {/* Couleurs */}
              <div>
                <label className="label">Couleurs de l'interface</label>
                <div className="flex gap-4">
                  {[
                    { label: "Primaire", value: couleur1, set: setCouleur1 },
                    { label: "Secondaire", value: couleur2, set: setCouleur2 },
                    { label: "Accent", value: couleur3, set: setCouleur3 },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={c.value}
                        onChange={(e) => c.set(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                      />
                      <div>
                        <p className="text-xs font-medium text-gray-700">
                          {c.label}
                        </p>
                        <p className="text-xs font-mono text-gray-400">
                          {c.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  ℹ Les couleurs s'appliquent au rechargement de la page.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes internes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="input resize-none"
                  placeholder="Informations complémentaires…"
                />
              </div>

              {/* Options métier */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Options métier
                </p>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chauffeurPeutSaisirCarburant}
                    onChange={(e) =>
                      setChauffeurPeutSaisirCarburant(e.target.checked)
                    }
                    className="w-4 h-4 accent-primary-600 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Autoriser les chauffeurs à saisir leurs pleins de
                      carburant
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Activé : le chauffeur voit le menu Carburant et peut
                      enregistrer ses propres pleins (pré-rempli avec son
                      véhicule affecté). Recommandé pour la précision des
                      données terrain.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  onClick={() => saveMut.mutate()}
                  disabled={saveMut.isPending}
                  className="btn-primary gap-2"
                >
                  {saveMut.isPending ? (
                    <>
                      <LoadingSpinner size="sm" /> Sauvegarde…
                    </>
                  ) : (
                    <>
                      <Save size={15} /> Sauvegarder
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Système ── */}
          {activeSection === "systeme" && (
            <>
              <LogoAppSection />
              <div className="card p-5">
                <h3 className="section-title flex items-center gap-2">
                  <Settings size={15} /> Environnement
                </h3>
                <dl className="space-y-2">
                  {[
                    ["Version API", "v1"],
                    ["Administrateur", user?.nom_complet ?? "—"],
                    ["Email", user?.email ?? "—"],
                    [
                      "Dernière connexion",
                      formatDate(user?.last_login_at ?? null),
                    ],
                  ].map(([l, v]) => (
                    <div
                      key={l as string}
                      className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0"
                    >
                      <dt className="text-gray-500">{l}</dt>
                      <dd className="font-medium">{v as string}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              {stats && (
                <div className="card p-5">
                  <h3 className="section-title flex items-center gap-2">
                    <Database size={15} /> Statistiques du parc
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      ["Véhicules", stats.nb_vehicules],
                      ["Chauffeurs", stats.nb_chauffeurs],
                      ["Utilisateurs", stats.nb_users],
                      ["Agences", stats.nb_agences],
                      ["Maintenances", stats.nb_maintenances],
                      ["Signalements", stats.nb_signalements],
                    ].map(([l, v]) => (
                      <div
                        key={l as string}
                        className="bg-gray-50 rounded-xl p-3 text-center"
                      >
                        <div className="text-2xl font-bold text-primary-700">
                          {v ?? "—"}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {l as string}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Tâches système ── */}
          {activeSection === "taches" && <TachesSection />}

          {/* ── Seuils & Alertes ── */}
          {activeSection === "alertes" && (
            <div className="card p-5">
              <h3 className="section-title flex items-center gap-2">
                <Bell size={15} /> Seuils d'alerte
              </h3>
              <div className="space-y-3 text-sm">
                <p className="text-gray-500">
                  Configurables dans{" "}
                  <code className="font-mono bg-gray-100 px-1 rounded">
                    config/parc.php
                  </code>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Permis critique", "15 jours"],
                    ["Permis warning", "30 jours"],
                    ["VT critique", "15 jours"],
                    ["Assurance critique", "15 jours"],
                    ["Entretien km", "10 000 km"],
                    ["Upload max", "10 Mo"],
                  ].map(([label, defaut]) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3">
                      <div className="font-medium text-xs text-gray-600 mb-1">
                        {label}
                      </div>
                      <div className="text-xs font-mono text-primary-600">
                        {defaut}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                  Après modification :{" "}
                  <code className="font-mono mx-1">
                    php artisan config:cache
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* ── RBAC & Permissions ── */}
          {/* ── Rôles & Permissions ── */}
          {activeSection === "permissions" && <RolesPermissionsSection />}

          {/* ── Agences ── */}
          {activeSection === "agences" && <AgencesSection />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section Agences
// ─────────────────────────────────────────────────────────────

function AgencesSection() {
  const { data: agences, isLoading } = useQuery({
    queryKey: ["agences-admin"],
    queryFn: () => api.get("/admin/agences").then((r) => r.data.data),
  });

  return (
    <div className="card p-5">
      <h3 className="section-title flex items-center gap-2">
        <Building2 size={15} /> Agences (
        {isLoading ? "…" : (agences?.length ?? 0)})
      </h3>
      {isLoading ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : (
        <div className="space-y-2 mb-4">
          {(agences ?? []).map((a: any) => (
            <div
              key={a.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
            >
              <div>
                <span className="font-medium text-sm">{a.nom}</span>
                <span className="ml-2 text-xs text-gray-400 font-mono">
                  {a.code}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {a.adresse && (
                  <span className="text-xs text-gray-400 hidden md:block">
                    {a.adresse}
                  </span>
                )}
                <span
                  className={`badge text-xs ${a.est_active !== false ? "badge-success" : "badge-gray"}`}
                >
                  {a.est_active !== false ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">
        La création/modification d'agences se fait via le backend.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section Tâches système
// ─────────────────────────────────────────────────────────────

function TachesSection() {
  const [results, setResults] = useState<
    Record<string, { output: string; elapsed: number; error?: string }>
  >({});
  const [running, setRunning] = useState<string | null>(null);

  const TACHES = [
    {
      command: "media-library:regenerate",
      label: "Régénérer les miniatures",
      description:
        "Régénère les miniatures des photos de véhicules. À lancer si les images ne s'affichent pas.",
      icon: "🖼",
      color: "border-indigo-200 bg-indigo-50",
    },
    {
      command: "email-queue:process",
      label: "Envoyer les emails en attente",
      description:
        "Traite la file de notifications email (pending) — envoi immédiat sans attendre le cron.",
      icon: "📧",
      color: "border-teal-200 bg-teal-50",
    },
    {
      command: "parc:scan-alertes",
      label: "Scan des alertes",
      description:
        "Vérifie VT, assurances, permis, entretiens, documents et génère les alertes manquantes.",
      icon: "🔔",
      color: "border-orange-200 bg-orange-50",
    },
    {
      command: "parc:update-documents",
      label: "Statuts documents",
      description:
        "Recalcule les statuts valide / à renouveler / expiré selon les dates d'expiration.",
      icon: "📄",
      color: "border-blue-200 bg-blue-50",
    },
    {
      command: "parc:stats",
      label: "Recalcul statistiques",
      description:
        "Recalcule les agrégats du tableau de bord et met à jour le cache.",
      icon: "📊",
      color: "border-purple-200 bg-purple-50",
    },
    {
      command: "permission:cache-reset",
      label: "Cache permissions",
      description: "Vide le cache Spatie des rôles et permissions.",
      icon: "🔑",
      color: "border-green-200 bg-green-50",
    },
    {
      command: "cache:clear",
      label: "Cache application",
      description: "Vide le cache de configuration et application Laravel.",
      icon: "🗑",
      color: "border-gray-200 bg-gray-50",
    },
  ];

  const runTask = async (command: string) => {
    setRunning(command);
    setResults((prev) => {
      const n = { ...prev };
      delete n[command];
      return n;
    });
    try {
      const res = await api.post("/admin/system/run-command", { command });
      setResults((prev) => ({
        ...prev,
        [command]: {
          output: res.data.data?.output ?? "Terminé.",
          elapsed: res.data.data?.elapsed ?? 0,
        },
      }));
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        [command]: {
          output: err?.response?.data?.message ?? "Erreur inconnue.",
          elapsed: 0,
          error: "true",
        },
      }));
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="section-title flex items-center gap-2">
          <Play size={15} /> Tâches système — déclenchement manuel
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Ces commandes sont normalement exécutées automatiquement par le
          planificateur. Vous pouvez les déclencher manuellement si nécessaire.
        </p>
        <div className="space-y-3">
          {TACHES.map((t) => {
            const result = results[t.command];
            const isRunning = running === t.command;
            return (
              <div
                key={t.command}
                className={`border rounded-xl p-4 ${t.color}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0">{t.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-800">
                        {t.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.description}
                      </p>
                      <code className="text-xs font-mono text-gray-400 mt-1 block">
                        php artisan {t.command}
                      </code>
                    </div>
                  </div>
                  <button
                    onClick={() => runTask(t.command)}
                    disabled={isRunning || running !== null}
                    className="btn-primary btn-sm gap-2 flex-shrink-0"
                  >
                    {isRunning ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                        Exécution…
                      </>
                    ) : (
                      <>
                        <Play size={12} /> Exécuter
                      </>
                    )}
                  </button>
                </div>
                {result && (
                  <div
                    className={`mt-3 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap border ${
                      result.error
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-white border-gray-200 text-gray-700"
                    }`}
                  >
                    <div className="flex justify-between mb-1">
                      <span
                        className={
                          result.error ? "text-red-500" : "text-green-600"
                        }
                      >
                        {result.error ? "✗ Erreur" : "✓ Succès"}
                      </span>
                      {!result.error && (
                        <span className="text-gray-400">
                          {result.elapsed}ms
                        </span>
                      )}
                    </div>
                    {result.output}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-700">
          ⚠ Ces commandes peuvent prendre plusieurs secondes selon la taille du
          parc. Ne fermez pas la page pendant l'exécution.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section Logo Application
// ─────────────────────────────────────────────────────────────

function LogoAppSection() {
  const qc = useQueryClient();
  const { config, setConfig } = useConfigStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    config?.logo_app_url ?? null,
  );

  const mut = useMutation({
    mutationFn: () => {
      if (!logoFile) return Promise.resolve(null);
      const fd = new FormData();
      fd.append("logo_app", logoFile, logoFile.name);
      return api.post("/admin/config", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (res) => {
      if (!res) return;
      setConfig({
        ...config!,
        logo_app_url:
          res.data.data?.logo_app_url ?? config?.logo_app_url ?? null,
      });
      qc.invalidateQueries({ queryKey: ["admin-config"] });
      toast.success("Logo application mis à jour.");
      setLogoFile(null);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erreur."),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  return (
    <div className="card p-5">
      <h3 className="section-title flex items-center gap-2">
        <Settings size={15} /> Logo de l'application
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        Affiché dans le <strong>sidebar</strong> à côté du nom de l'application.
        Distinct du logo entreprise (Topbar + PDFs).
      </p>
      <div className="flex items-center gap-5">
        <div
          className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary-400 transition-colors bg-gray-50"
          onClick={() => fileRef.current?.click()}
        >
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="Logo app"
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <div className="text-center">
              <Upload size={18} className="mx-auto text-gray-300 mb-1" />
              <p className="text-xs text-gray-400">Logo</p>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.svg,.webp"
          className="hidden"
          onChange={handleChange}
        />
        <div>
          <p className="text-sm font-medium text-gray-700">Logo sidebar</p>
          <p className="text-xs text-gray-400 mt-0.5">
            PNG · SVG · JPG · max 2 Mo
          </p>
          <p className="text-xs text-gray-400">
            Recommandé : carré 64×64px minimum
          </p>
          {logoFile && (
            <p className="text-xs text-primary-600 mt-1 font-medium">
              ✓ {logoFile.name}
            </p>
          )}
        </div>
      </div>
      {logoFile && (
        <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              setLogoFile(null);
              setLogoPreview(config?.logo_app_url ?? null);
            }}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="btn-primary gap-2"
          >
            {mut.isPending ? (
              <>
                <LoadingSpinner size="sm" /> Sauvegarde…
              </>
            ) : (
              <>
                <Save size={14} /> Enregistrer
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

const ROLE_DEFINITIONS: Record<string, { color: string; description: string }> =
  {
    super_admin: {
      color: "bg-red-50 text-red-700 border-red-100",
      description:
        "Accès total — toutes les fonctionnalités et la configuration système. Conserve toujours toutes les permissions.",
    },
    directeur: {
      color: "bg-orange-50 text-orange-700 border-orange-100",
      description:
        "Lecture/écriture globale — approbation des bons de commande, rapports, gestion des utilisateurs.",
    },
    resp_parc: {
      color: "bg-blue-50 text-blue-700 border-blue-100",
      description:
        "Gestion complète du parc : véhicules, maintenance, affectations, signalements, rapports — toutes agences.",
    },
    resp_agence: {
      color: "bg-blue-50 text-blue-700 border-blue-100",
      description:
        "Identique au Resp. Parc, mais scopé uniquement aux véhicules et chauffeurs de son agence.",
    },
    comptable: {
      color: "bg-green-50 text-green-700 border-green-100",
      description:
        "Carburant, bons de commande, rapports financiers — pas d'accès à la gestion opérationnelle.",
    },
    chauffeur: {
      color: "bg-gray-50 text-gray-700 border-gray-100",
      description:
        "Checklists, signalements, affectations en lecture, et son véhicule attribué uniquement.",
    },
    attributaire: {
      color: "bg-gray-50 text-gray-700 border-gray-100",
      description:
        "Identique au Chauffeur — utilisateur disposant d'un véhicule de service attribué.",
    },
  };

// ─────────────────────────────────────────────────────────────
// Section Rôles & Permissions (RBAC)
// ─────────────────────────────────────────────────────────────

function RolesPermissionsSection() {
  const qc = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  // Liste des rôles
  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["roles-list"],
    queryFn: () => rolesApi.list().then((r) => r.data.data),
  });

  // Détail du rôle sélectionné
  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["role-permissions", selectedRoleId],
    queryFn: () => rolesApi.show(selectedRoleId!).then((r) => r.data.data),
    enabled: !!selectedRoleId,
  });

  // Permissions cochées localement (état d'édition)
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [initialChecked, setInitialChecked] = useState<Set<string>>(new Set());

  // Synchroniser l'état local à chaque chargement d'un nouveau rôle
  useEffect(() => {
    if (!detail) return;
    const attribuees = new Set<string>();
    detail.modules.forEach((m) =>
      m.permissions.forEach((p) => {
        if (p.attribue) attribuees.add(p.name);
      }),
    );
    setChecked(new Set(attribuees));
    setInitialChecked(new Set(attribuees));
  }, [detail?.role.id, detail?.total_attribuees]);

  const togglePermission = (name: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleModule = (module: ModuleGroup, tout: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      module.permissions.forEach((p) => {
        if (tout) next.add(p.name);
        else next.delete(p.name);
      });
      return next;
    });
  };

  const syncMut = useMutation({
    mutationFn: () => rolesApi.sync(selectedRoleId!, Array.from(checked)),
    onSuccess: (res) => {
      toast.success(res.data.message ?? "Permissions mises à jour.");
      toast(
        "🔄 Cache des permissions vidé automatiquement.\nLes utilisateurs déjà connectés doivent se reconnecter pour voir les changements.",
        { duration: 6000, icon: "ℹ️" },
      );
      setInitialChecked(new Set(checked));
      qc.invalidateQueries({ queryKey: ["roles-list"] });
      qc.invalidateQueries({ queryKey: ["role-permissions", selectedRoleId] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ?? "Erreur lors de la mise à jour.",
      );
    },
  });

  const resetChanges = () => setChecked(new Set(initialChecked));

  // Calcul des changements en attente
  const ajouts = Array.from(checked).filter((p) => !initialChecked.has(p));
  const retraits = Array.from(initialChecked).filter((p) => !checked.has(p));
  const hasChanges = ajouts.length > 0 || retraits.length > 0;

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Liste des rôles */}
      <div className="col-span-4">
        <div className="card p-4">
          <h3 className="section-title flex items-center gap-2 mb-3">
            <Shield size={15} /> Rôles
          </h3>

          {loadingRoles ? (
            <div className="py-6 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {roles.map((role) => {
                const def = ROLE_DEFINITIONS[role.name];
                return (
                  <button
                    key={role.id}
                    onClick={() => {
                      if (role.protege) return;
                      setSelectedRoleId(role.id);
                    }}
                    disabled={role.protege}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2
                    ${
                      selectedRoleId === role.id
                        ? "border-primary-300 bg-primary-50"
                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    }
                    ${role.protege ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {role.protege ? (
                        <Lock
                          size={13}
                          className="text-gray-400 flex-shrink-0"
                        />
                      ) : (
                        <Unlock
                          size={13}
                          className="text-primary-400 flex-shrink-0"
                        />
                      )}
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded-md border ${def?.color ?? "bg-gray-50 text-gray-700 border-gray-100"}`}
                      >
                        {role.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-400">
                      <span className="flex items-center gap-0.5">
                        <Shield size={11} />
                        {role.permissions_count}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Users size={11} />
                        {role.users_count}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-gray-400 mt-3">
            <Lock size={10} className="inline mr-1" />
            Super Admin conserve toujours toutes les permissions.
          </p>
        </div>
      </div>

      {/* Matrice de permissions */}
      <div className="col-span-8">
        <div className="card p-4 min-h-[400px]">
          {!selectedRoleId ? (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center">
              <Shield size={32} className="text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">
                Sélectionnez un rôle pour gérer ses permissions
              </p>
            </div>
          ) : loadingDetail || !detail ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    {selectedRole?.label}
                    <span className="badge bg-primary-50 text-primary-700 text-xs">
                      {checked.size} / {detail.total_disponibles} permissions
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Cochez ou décochez les permissions à attribuer à ce rôle
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {hasChanges && (
                    <button
                      onClick={resetChanges}
                      className="btn-secondary text-xs gap-1 px-3 py-1.5"
                    >
                      <RotateCcw size={12} /> Annuler
                    </button>
                  )}
                  <button
                    onClick={() => syncMut.mutate()}
                    disabled={!hasChanges || syncMut.isPending}
                    className="btn-primary text-xs gap-1 px-3 py-1.5 disabled:opacity-50"
                  >
                    {syncMut.isPending ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Save size={12} />
                    )}
                    Enregistrer
                    {hasChanges ? ` (${ajouts.length + retraits.length})` : ""}
                  </button>
                </div>
              </div>

              {/* Définition du rôle */}
              {selectedRole && ROLE_DEFINITIONS[selectedRole.name] && (
                <div
                  className={`mb-3 px-3 py-2 rounded-lg border text-xs ${ROLE_DEFINITIONS[selectedRole.name].color}`}
                >
                  {ROLE_DEFINITIONS[selectedRole.name].description}
                </div>
              )}

              {/* Récapitulatif des changements en attente */}
              {hasChanges && (
                <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
                  {ajouts.map((p) => (
                    <span
                      key={p}
                      className="badge bg-green-50 text-green-700 flex items-center gap-1"
                    >
                      <Check size={10} /> {p}
                    </span>
                  ))}
                  {retraits.map((p) => (
                    <span
                      key={p}
                      className="badge bg-red-50 text-red-700 flex items-center gap-1"
                    >
                      <X size={10} /> {p}
                    </span>
                  ))}
                </div>
              )}

              {/* Modules */}
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {detail.modules.map((module) => {
                  const tousChecked = module.permissions.every((p) =>
                    checked.has(p.name),
                  );
                  const partielChecked =
                    !tousChecked &&
                    module.permissions.some((p) => checked.has(p.name));

                  return (
                    <div
                      key={module.module}
                      className="border border-gray-100 rounded-xl overflow-hidden"
                    >
                      {/* Header module */}
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tousChecked}
                            ref={(el) => {
                              if (el) el.indeterminate = partielChecked;
                            }}
                            onChange={(e) =>
                              toggleModule(module, e.target.checked)
                            }
                            className="w-3.5 h-3.5 accent-primary-600"
                          />
                          <span className="font-medium text-sm text-gray-800">
                            {module.label}
                          </span>
                        </label>
                        <span className="text-xs text-gray-400">
                          {
                            module.permissions.filter((p) =>
                              checked.has(p.name),
                            ).length
                          }{" "}
                          / {module.permissions.length}
                        </span>
                      </div>

                      {/* Permissions du module */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-2">
                        {module.permissions.map((p) => (
                          <label
                            key={p.name}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked.has(p.name)}
                              onChange={() => togglePermission(p.name)}
                              className="w-3.5 h-3.5 accent-primary-600 flex-shrink-0"
                            />
                            <span
                              className="text-gray-600 truncate"
                              title={p.name}
                            >
                              {p.action}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rappel cache */}
              <div className="mt-3 p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-[11px] text-gray-500 flex items-start gap-2">
                <RotateCcw
                  size={12}
                  className="mt-0.5 flex-shrink-0 text-gray-400"
                />
                <span>
                  Le cache des permissions est vidé automatiquement à chaque
                  enregistrement. En cas de besoin, il peut aussi être
                  réinitialisé manuellement via{" "}
                  <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">
                    php artisan permission:cache-reset
                  </code>
                  .
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
