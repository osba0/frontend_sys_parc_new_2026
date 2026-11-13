import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  backTo?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  backTo,
  actions,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 md:mb-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="btn-icon mt-0.5"
            title="Retour"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0 sm:ml-4">
          {actions}
        </div>
      )}
    </div>
  );
}
