import { isNouveau } from "@/utils";

interface NewBadgeProps {
  /** Date de création de l'élément (created_at) */
  createdAt: string | null | undefined;
  /** Période de fraîcheur en jours — défaut 7 */
  jours?: number;
  /** Classes additionnelles */
  className?: string;
}

/**
 * Badge "NEW" affiché automatiquement pour les éléments créés
 * récemment (par défaut dans les 7 derniers jours).
 *
 * Aucune donnée supplémentaire requise — calcul basé sur `created_at`.
 *
 * Usage :
 *   <NewBadge createdAt={vehicule.created_at} />
 *   <NewBadge createdAt={chauffeur.created_at} jours={3} />
 */
export default function NewBadge({
  createdAt,
  jours = 7,
  className = "",
}: NewBadgeProps) {
  if (!isNouveau(createdAt, jours)) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 pl-1.5 pr-1 py-[1px] bg-red-500 text-white text-[9px] font-bold leading-none ${className}`}
      style={{
        clipPath: "polygon(0 0, 78% 0, 100% 50%, 78% 100%, 0 100%)",
        borderRadius: "2px",
      }}
      title={`Ajouté récemment (moins de ${jours} jour${jours > 1 ? "s" : ""})`}
    >
      NEW
      <span className="w-1 h-1 rounded-full bg-white/90 ml-0.5" />
    </span>
  );
}
