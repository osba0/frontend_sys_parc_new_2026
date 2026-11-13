import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { LoadingSpinner } from "./LoadingPage";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "info";
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  loading,
  title = "Confirmer l'action",
  message,
  confirmLabel = "Confirmer",
  variant = "danger",
}: ConfirmDialogProps) {
  if (!open) return null;

  const btnClass = {
    danger: "btn-danger",
    warning: "btn bg-yellow-500 text-white hover:bg-yellow-600",
    info: "btn-primary",
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={!loading ? onClose : undefined}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              variant === "danger"
                ? "bg-red-100"
                : variant === "warning"
                  ? "bg-yellow-100"
                  : "bg-blue-100"
            }`}
          >
            <AlertTriangle
              size={20}
              className={
                variant === "danger"
                  ? "text-red-600"
                  : variant === "warning"
                    ? "text-yellow-600"
                    : "text-blue-600"
              }
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading} className={btnClass}>
            {loading ? <LoadingSpinner size="sm" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
