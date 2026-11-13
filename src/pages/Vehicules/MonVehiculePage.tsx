import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth.api";
import { chauffeursApi } from "@/api/operations.api";
import { Car, ArrowRight } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingPage";

/**
 * /mon-vehicule — route dédiée chauffeur/attributaire
 *
 * - 0 véhicule  → message "aucun véhicule affecté"
 * - 1 véhicule  → redirection directe vers la fiche véhicule
 * - 2+ véhicules → liste de sélection
 */
export default function MonVehiculePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const c = user?.chauffeur;

  // Utiliser /auth/me — toujours accessible par le chauffeur
  const { data: meData, isLoading } = useQuery({
    queryKey: ["me-vehicules-actifs"],
    queryFn: () =>
      authApi.me().then((r) => {
        setUser(r.data.data);
        return r.data.data;
      }),
    enabled: !!c?.id,
    staleTime: 30_000,
  });

  const vehiculesActifs = (() => {
    const fromApi = meData?.chauffeur?.vehicules_actifs;
    if (fromApi?.length) return fromApi;
    const fromStore = c?.vehicules_actifs;
    if (fromStore?.length) return fromStore;
    if (c?.vehicule_actuel)
      return [{ ...c.vehicule_actuel, type_carburant: null, agence_id: null }];
    return [];
  })();

  // Un seul véhicule → redirection automatique
  useEffect(() => {
    if (!isLoading && vehiculesActifs.length === 1) {
      navigate(`/vehicules/${vehiculesActifs[0].vehicule_id}`, {
        replace: true,
      });
    }
  }, [isLoading, vehiculesActifs.length]); // eslint-disable-line

  // Chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  // Aucun véhicule
  if (vehiculesActifs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
          <Car size={28} className="text-gray-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-700">
            Aucun véhicule affecté
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Aucun véhicule ne vous est actuellement affecté.
          </p>
          <p className="text-gray-400 text-sm">
            Contactez votre responsable de parc.
          </p>
        </div>
      </div>
    );
  }

  // Un seul véhicule → spinner pendant la redirection
  if (vehiculesActifs.length === 1) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Plusieurs véhicules → liste de sélection
  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      <div className="text-center">
        <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Car size={26} className="text-primary-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">
          Mes véhicules affectés
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Vous avez {vehiculesActifs.length} véhicules affectés. Sélectionnez
          celui que vous souhaitez consulter.
        </p>
      </div>

      <div className="space-y-3">
        {vehiculesActifs.map((v) => (
          <button
            key={v.vehicule_id}
            onClick={() => navigate(`/vehicules/${v.vehicule_id}`)}
            className="w-full flex items-center gap-4 p-4 card hover:shadow-md hover:border-primary-200 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
              <Car size={22} className="text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-primary-700 font-mono">
                {v.immatriculation}
              </p>
              <p className="text-sm text-gray-500">{v.marque_modele}</p>
              {v.depuis && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Affecté depuis le{" "}
                  {new Date(v.depuis).toLocaleDateString("fr-SN")}
                </p>
              )}
            </div>
            <ArrowRight
              size={18}
              className="text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
