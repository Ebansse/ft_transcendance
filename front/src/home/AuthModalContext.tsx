import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { api, ApiError } from "../lib/apiClient.ts";

type AuthModalContextType = {
  openModal: () => void;
  closeModal: () => void;
  isLoggedIn: boolean;
};

const AuthModalContext = createContext<AuthModalContextType | null>(null);

type RegisterForm ={
  userName: string;
  email: string;
  password: string;
  confirmedPassword: string;
};

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [form, setForm] = useState<RegisterForm>({
    userName: "",
    email: "",
    password: "",
    confirmedPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const openModal = () => setIsOpen(true);

  const closeModal = () => {
    setIsOpen(false);
    setFieldErrors({});
    setGlobalError(null);
  };

  const handleChange =
    (field: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGlobalError(null);

    try {
      await api.post<void>("/auth/register", form);
      setIsLoggedIn(true);
      setForm({ userName: "", email: "", password: "", confirmedPassword: "" });
      closeModal();
    } catch (err) {
      if (err instanceof ApiError) {
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors(err.fieldErrors);
        } else {
          setGlobalError(err.message);
        }
      } else {
        setGlobalError("Erreur inconnue.");
      }
    }
  };

  return (
    <AuthModalContext.Provider value={{ openModal, closeModal, isLoggedIn }}>
      {children}

      {isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeModal}>Fermer</button>

            <div>
              <button onClick={() => setMode("login")}>Connexion</button>
              <button onClick={() => setMode("signup")}>Inscription</button>
            </div>

            {mode === "signup" ? (
              <form onSubmit={handleSignup}>
                <input
                  type="text"
                  placeholder="Nom d'utilisateur"
                  value={form.userName}
                  onChange={handleChange("userName")}
                />
                {fieldErrors.userName && (
                  <p style={{ color: "red" }}>{fieldErrors.userName}</p>
                )}

                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange("email")}
                />
                {fieldErrors.email && (
                  <p style={{ color: "red" }}>{fieldErrors.email}</p>
                )}

                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={form.password}
                  onChange={handleChange("password")}
                />
                {fieldErrors.password && (
                  <p style={{ color: "red" }}>{fieldErrors.password}</p>
                )}

                <input
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  value={form.confirmedPassword}
                  onChange={handleChange("confirmedPassword")}
                />
                {fieldErrors.confirmedPassword && (
                  <p style={{ color: "red" }}>{fieldErrors.confirmedPassword}</p>
                )}

                {globalError && <p style={{ color: "red" }}>{globalError}</p>}

                <button type="submit">S'inscrire</button>
              </form>
            ) : (
              <form>
                <p>Pas encore d'endpoint /login côté backend.</p>
                <input type="email" placeholder="Email" disabled />
                <input type="password" placeholder="Mot de passe" disabled />
                <button type="submit" disabled>
                  Se connecter
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal doit être utilisé dans AuthModalProvider");
  return ctx;
}