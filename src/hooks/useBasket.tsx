import { createContext, useContext, useState, ReactNode } from "react";
import { CommonsFile } from "../types/commons";

interface BasketContextType {
  basket: CommonsFile[];
  addToBasket: (file: CommonsFile) => void;
  removeFromBasket: (pageId: number) => void;
  isInBasket: (pageId: number) => boolean;
  clearBasket: () => void;
}

const BasketContext = createContext<BasketContextType | undefined>(undefined);

export function BasketProvider({ children }: { children: ReactNode }) {
  const [basket, setBasket] = useState<CommonsFile[]>([]);

  const addToBasket = (file: CommonsFile) => {
    setBasket((prev) => {
      if (prev.some((f) => f.pageId === file.pageId)) return prev;
      return [...prev, file];
    });
  };

  const removeFromBasket = (pageId: number) => {
    setBasket((prev) => prev.filter((f) => f.pageId !== pageId));
  };

  const isInBasket = (pageId: number) => basket.some((f) => f.pageId === pageId);

  const clearBasket = () => setBasket([]);

  return (
    <BasketContext.Provider
      value={{ basket, addToBasket, removeFromBasket, isInBasket, clearBasket }}
    >
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error("useBasket must be used within BasketProvider");
  return ctx;
}
