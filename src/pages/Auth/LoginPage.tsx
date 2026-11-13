import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn, Mail, Hash } from "lucide-react";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

const schema = z.object({
  login: z.string().min(1, "Email ou matricule requis"),
  password: z.string().min(1, "Mot de passe requis"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPwd, setShowPwd] = useState(false);
  const [loginValue, setLoginValue] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data.login.trim(), data.password);
      const { token, user } = res.data.data;
      setAuth(token, user);
      toast.success(`Bienvenue, ${user.prenom ?? user.name} !`);
      navigate("/dashboard");
    } catch (err: any) {
      const msg =
        err?.response?.data?.errors?.login?.[0] ??
        err?.response?.data?.message ??
        "Identifiants invalides.";
      toast.error(msg);
    }
  };

  const loginType = loginValue.includes("@")
    ? "email"
    : loginValue.length > 0
      ? "matricule"
      : null;

  return (
    <>
      {/* Titre section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Connexion</h2>
        <p className="text-sm text-gray-400 mt-1">
          Entrez votre <span className="text-gray-600 font-medium">email</span>{" "}
          ou votre <span className="text-gray-600 font-medium">matricule</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Identifiant */}
        <div>
          <label
            htmlFor="login"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Identifiant
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {loginType === "email" ? (
                <Mail size={15} className="text-primary-500" />
              ) : loginType === "matricule" ? (
                <Hash size={15} className="text-emerald-500" />
              ) : (
                <Mail size={15} className="text-gray-300" />
              )}
            </span>
            <input
              id="login"
              autoFocus
              autoComplete="username"
              {...register("login")}
              onChange={(e) => {
                register("login").onChange(e);
                setLoginValue(e.target.value);
              }}
              placeholder="email@entreprise.sn ou MAT-001"
              className={`w-full pl-9 pr-24 py-2.5 border rounded-xl text-sm outline-none transition-all
                ${
                  errors.login
                    ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50"
                    : "border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-50"
                }`}
            />
            {loginType && (
              <span
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded-full pointer-events-none ${
                  loginType === "email"
                    ? "bg-primary-50 text-primary-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {loginType === "email" ? "Email" : "Matricule"}
              </span>
            )}
          </div>
          {errors.login && (
            <p className="text-xs text-red-500 mt-1">{errors.login.message}</p>
          )}
          {loginType === "matricule" && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <Hash size={11} /> Connexion chauffeur par matricule
            </p>
          )}
        </div>

        {/* Mot de passe */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              {...register("password")}
              placeholder="••••••••"
              className={`w-full pl-3 pr-10 py-2.5 border rounded-xl text-sm outline-none transition-all
                ${
                  errors.password
                    ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50"
                    : "border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-50"
                }`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Bouton */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors mt-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
              Connexion…
            </>
          ) : (
            <>
              <LogIn size={16} /> Se connecter
            </>
          )}
        </button>
      </form>

      {/* Modes de connexion */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">deux modes de connexion</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl">
            <Mail size={14} className="text-primary-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary-700">
                Par email
              </p>
              <p className="text-[11px] text-gray-400">Tous les utilisateurs</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
            <Hash size={14} className="text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-700">
                Par matricule
              </p>
              <p className="text-[11px] text-gray-400">Chauffeurs uniquement</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
