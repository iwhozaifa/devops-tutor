"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { XpToast } from "./XpToast";

interface BadgeInfo {
  title: string;
  icon: string;
}

interface GamificationContextValue {
  showXpGain: (amount: number, badges?: BadgeInfo[]) => void;
}

const GamificationContext = createContext<GamificationContextValue>({
  showXpGain: () => {},
});

export function useGamification() {
  return useContext(GamificationContext);
}

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState(0);
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showXpGain = useCallback((xp: number, newBadges?: BadgeInfo[]) => {
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setAmount(xp);
    setBadges(newBadges ?? []);
    setVisible(true);

    timerRef.current = setTimeout(() => {
      setVisible(false);
    }, 3000);
  }, []);

  return (
    <GamificationContext.Provider value={{ showXpGain }}>
      {children}
      <XpToast amount={amount} badges={badges} visible={visible} />
    </GamificationContext.Provider>
  );
}
