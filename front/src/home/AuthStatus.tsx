import { useAuthModal } from "./AuthModalContext";

export function AuthStatus() {
  const { isLoggedIn } = useAuthModal();

  if (!isLoggedIn) return null;

  return <button disabled>Connecté</button>;
}