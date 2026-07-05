import { createContext, useContext, useState, ReactNode } from "react";

type AttributionFormat = "plain" | "markdown" | "html";

interface AttributionContextType {
  format: AttributionFormat;
  setFormat: (format: AttributionFormat) => void;
}

const AttributionContext = createContext<AttributionContextType | undefined>(undefined);

export function AttributionProvider({ children }: { children: ReactNode }) {
  const [format, setFormat] = useState<AttributionFormat>("plain");

  return (
    <AttributionContext.Provider value={{ format, setFormat }}>
      {children}
    </AttributionContext.Provider>
  );
}

export function useAttributionFormat() {
  const context = useContext(AttributionContext);
  if (context === undefined) {
    throw new Error("useAttributionFormat must be used within an AttributionProvider");
  }
  return context;
}
