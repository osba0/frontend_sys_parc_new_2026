// ============================================================
// Tous les imports en haut — convention ES modules
// ============================================================
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type VehiculeFilters, vehiculesApi } from "@/api/vehicules.api";
import { chauffeursApi } from "@/api/operations.api";
import {
  agencesApi,
  dashboardApi,
  maintenancesApi,
  fournisseursApi,
} from "@/api/finance.api";
import type { Chauffeur } from "@/types";
import toast from "react-hot-toast";

// ============================================================
// Agences — select RBAC-safe (staleTime infini, données stables)
// ============================================================
export function useAgences({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["agences"],
    queryFn: () => agencesApi.list().then((r) => r.data.data as any[]),
    staleTime: Infinity,
    enabled,
  });
}

// ============================================================
// Véhicules
// ============================================================
export function useVehicules(filters?: VehiculeFilters) {
  return useQuery({
    queryKey: ["vehicules", filters],
    queryFn: () => vehiculesApi.list(filters).then((r) => r.data),
  });
}

export function useVehicule(id: number | undefined) {
  return useQuery({
    queryKey: ["vehicule", id],
    queryFn: () =>
      vehiculesApi
        .get(
          id!,
          "agence,affectationActive.chauffeur,affectationActive.axeLivraison",
        )
        .then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCreateVehicule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: vehiculesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Véhicule créé avec succès.");
    },
  });
}

export function useUpdateVehicule(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => vehiculesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicules"] });
      qc.invalidateQueries({ queryKey: ["vehicule", id] });
      toast.success("Véhicule mis à jour.");
    },
  });
}

export function useDeleteVehicule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: vehiculesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Véhicule supprimé.");
    },
  });
}

export function useUpdateKilometrage(vehiculeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (km: number) => vehiculesApi.updateKilometrage(vehiculeId, km),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["vehicule", vehiculeId] });
      qc.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success(
        `Kilométrage mis à jour : ${res.data.data.km_nouveau?.toLocaleString("fr-SN")} km`,
      );
    },
  });
}

// ============================================================
// Chauffeurs
// ============================================================
export function useChauffeurs(params?: object) {
  return useQuery({
    queryKey: ["chauffeurs", params],
    queryFn: () => chauffeursApi.list(params).then((r) => r.data),
  });
}

export function useChauffeur(id: number | undefined) {
  return useQuery({
    queryKey: ["chauffeur", id],
    queryFn: () => chauffeursApi.get(id!).then((r) => r.data.data as Chauffeur),
    enabled: !!id,
  });
}

export function useCreateChauffeur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => chauffeursApi.create(data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["chauffeurs"] });
      toast.success("Chauffeur créé avec succès.");
    },
  });
}

export function useUpdateChauffeur(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => {
      // FormData multipart → POST + _method=PUT (method spoofing Laravel)
      // car PHP ne parse pas le body d'un PUT multipart
      const isFormData = data instanceof FormData;
      return isFormData
        ? chauffeursApi.updateMultipart(id, data)
        : chauffeursApi.update(id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chauffeurs"] });
      qc.invalidateQueries({ queryKey: ["chauffeur", id] });
      toast.success("Chauffeur mis à jour.");
    },
  });
}

// ============================================================
// Maintenances
// ============================================================
export function useMaintenances(params?: object) {
  return useQuery({
    queryKey: ["maintenances", params],
    queryFn: () => maintenancesApi.list(params).then((r) => r.data),
  });
}

export function useMaintenance(id: string | number | undefined) {
  return useQuery({
    queryKey: ["maintenance", String(id)],
    queryFn: () => maintenancesApi.get(Number(id!)).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useMaintenanceStats(params?: object) {
  return useQuery({
    queryKey: ["maintenances-stats", params],
    queryFn: () => maintenancesApi.stats(params).then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: maintenancesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenances"] });
      qc.invalidateQueries({ queryKey: ["maintenances-stats"] });
      toast.success("Maintenance enregistrée.");
    },
  });
}

export function useUpdateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) =>
      maintenancesApi.update(Number(id), data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ["maintenances"] });
      qc.invalidateQueries({ queryKey: ["maintenance", String(id)] });
      qc.invalidateQueries({ queryKey: ["maintenances-stats"] });
      toast.success("Maintenance mise à jour.");
    },
  });
}

export function useCloturerMaintenance(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => maintenancesApi.cloturer(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenances"] });
      qc.invalidateQueries({ queryKey: ["maintenance", id] });
      qc.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Maintenance clôturée. Véhicule remis en service.");
    },
  });
}

// ============================================================
// Dashboard
// ============================================================
export function useDashboardStats(mois?: number, annee?: number) {
  return useQuery({
    queryKey: ["dashboard-stats", mois, annee],
    queryFn: () => dashboardApi.stats(mois, annee).then((r) => r.data.data),
    staleTime: 2 * 60 * 1000,
    refetchInterval: mois || annee ? false : 5 * 60 * 1000, // pas de polling auto pour périodes historiques
  });
}

export function useDashboardAlertes() {
  return useQuery({
    queryKey: ["dashboard-alertes"],
    queryFn: () => dashboardApi.alertesActives().then((r) => r.data.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useKpiMensuel(annee?: number) {
  return useQuery({
    queryKey: ["kpi-mensuel", annee],
    queryFn: () => dashboardApi.kpiMensuel(annee).then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useActiviteRecente(limit = 10) {
  return useQuery({
    queryKey: ["activite-recente", limit],
    queryFn: () => dashboardApi.activiteRecente(limit).then((r) => r.data.data),
    staleTime: 60 * 1000,
  });
}

// ============================================================
// Fournisseurs
// ============================================================
export function useFournisseurs(params?: object) {
  return useQuery({
    queryKey: ["fournisseurs", params],
    queryFn: () =>
      fournisseursApi.list(params).then((r) => r.data.data as any[]),
    staleTime: 5 * 60 * 1000,
  });
}
