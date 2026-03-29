// context/MedicalHistoryContext.tsx
// Revert to original localStorage-only implementation
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface HistoryItem {
  id: string;
  type: "Appointment" | "Medicine" | "Analysis";
  data: string;
  details?: any;
  date: string;
}

type MedicalHistoryContextType = {
  history: HistoryItem[];
  addHistory: (item: Omit<HistoryItem, "id" | "date">) => void;
  insertOptimistic: (item: HistoryItem) => void;
  refreshHistory: () => void;
  isLoading: boolean;
};

const MedicalHistoryContext = createContext<MedicalHistoryContextType | undefined>(undefined);

export const useMedicalHistory = () => {
  const context = useContext(MedicalHistoryContext);
  if (!context) throw new Error("MedicalHistoryProvider is missing");
  return context;
};

export const MedicalHistoryProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load history from DB on mount
  useEffect(() => {
    refreshHistory();
  }, []);

  const addHistory = async (item: Omit<HistoryItem, "id" | "date">) => {
    try {
      const response = await fetch("/api/medical-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (response.ok) {
        // Optimistically insert locally or refresh entirely
        refreshHistory();
      }
    } catch (error) {
       console.error("Failed to add to remote medical history", error);
    }
  };

  const refreshHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/medical-history");
      if (response.ok) {
        const data = await response.json();
        
        let offlineUnsynced: HistoryItem[] = [];
        // Merge with locally stored optimistic offline items
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("temp_medical_history");
          if (stored) {
            try {
              const localItems: HistoryItem[] = JSON.parse(stored);
              // Filter out ones that eventually made it to AWS to avoid duplicates
              const backendTexts = new Set(data.map((d: any) => d.data + d.date.split("T")[0]));
              offlineUnsynced = localItems.filter((loc) => !backendTexts.has(loc.data + loc.date.split("T")[0]));
              
              if (offlineUnsynced.length === 0) {
                 localStorage.removeItem("temp_medical_history");
              } else {
                 // Remove duplicates from offlineUnsynced too
                 const dedupedLocal = Array.from(new Map(offlineUnsynced.map(item => [item.id, item])).values());
                 localStorage.setItem("temp_medical_history", JSON.stringify(dedupedLocal));
                 offlineUnsynced = dedupedLocal;
              }
            } catch(e) {}
          }
        }
        
        const mergedArray = [...offlineUnsynced, ...data];
        // Enforce strong deduplication by ID to prevent any React key collisions
        const dedupedMap = new Map();
        mergedArray.forEach(item => {
           if (!dedupedMap.has(item.id)) {
               dedupedMap.set(item.id, item);
           }
        });
        
        setHistory(Array.from(dedupedMap.values()));
      }
    } catch (error) {
      console.error("Error refreshing remote history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const insertOptimistic = (item: HistoryItem) => {
    setHistory(prev => {
      const updated = [item, ...prev];
      // Force array uniqueness
      const dedupedMap = new Map();
      updated.forEach(i => {
         if(!dedupedMap.has(i.id)) dedupedMap.set(i.id, i);
      });
      const dedupedList = Array.from(dedupedMap.values()) as HistoryItem[];
      
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("temp_medical_history");
          const localItems = stored ? JSON.parse(stored) : [];
          const newLocals = [item, ...localItems];
          const offlineDedupMap = new Map();
          newLocals.forEach(i => {
             if(!offlineDedupMap.has(i.id)) offlineDedupMap.set(i.id, i);
          });
          localStorage.setItem("temp_medical_history", JSON.stringify(Array.from(offlineDedupMap.values())));
        } catch(e) {}
      }
      return dedupedList;
    });
  };

  return (
    <MedicalHistoryContext.Provider value={{ history, addHistory, insertOptimistic, refreshHistory, isLoading }}>
      {children}
    </MedicalHistoryContext.Provider>
  );
};
