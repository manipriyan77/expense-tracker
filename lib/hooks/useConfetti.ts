"use client";

export function useConfetti() {
  const fire = async () => {
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#16a34a", "#2563eb", "#d97706", "#9333ea"],
    });
  };

  return { fire };
}
