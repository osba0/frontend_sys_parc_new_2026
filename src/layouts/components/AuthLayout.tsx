import { useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useAppStore } from "@/stores/appStore";
import { useDynamicFavicon } from "@/hooks/useDynamicFavicon";

export default function AuthLayout() {
  const token = useAuthStore((s) => s.token);
  const { appName, fetchAppInfo } = useAppStore();

  useDynamicFavicon();

  useEffect(() => {
    fetchAppInfo();
  }, [fetchAppInfo]);

  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      {/* Cercles décoratifs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 -left-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 right-1/4 w-80 h-80 bg-white/5 rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo + titre — UNE seule fois ici */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-2xl mb-4">
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8 text-primary-700"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                d="M3 17l2-7h14l2 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M1 17h22" strokeLinecap="round" />
              <circle
                cx="5.5"
                cy="17"
                r="2"
                fill="currentColor"
                stroke="none"
              />
              <circle
                cx="18.5"
                cy="17"
                r="2"
                fill="currentColor"
                stroke="none"
              />
              <path
                d="M5 10V7a1 1 0 011-1h12a1 1 0 011 1v3"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {appName}
          </h1>
          <p className="text-primary-200 mt-1.5 text-sm">
            Système de gestion du parc automobile
          </p>
        </div>

        {/* Carte blanche — le contenu vient de LoginPage */}
        <div className="bg-white rounded-2xl shadow-2xl px-8 py-7">
          <Outlet />
        </div>

        <p className="text-center text-primary-300/60 text-xs mt-5">
          © {new Date().getFullYear()} {appName} — Tous droits réservés
        </p>
      </div>
    </div>
  );
}
