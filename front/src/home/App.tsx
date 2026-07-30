import { useAuthModal } from "./AuthModalContext";

export function UnoButton() {
  const { openModal } = useAuthModal();
  return <button onClick={openModal}>uno</button>;
}

export function BlackjackButton() {
  const { openModal } = useAuthModal();
  return <button onClick={openModal}>blackjack</button>;
}

export function PokerButton() {
  const { openModal } = useAuthModal();
  return <button onClick={openModal}>poker</button>;
}

export default function App() {
  return <h1>ft_transcendence</h1>;
}