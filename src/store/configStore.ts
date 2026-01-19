import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Config } from "../config";
import { CFG } from "../config";

interface ConfigState {
  config: Config;
  setConfig: (partial: Partial<Config>) => void;
  resetConfig: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: { ...CFG },
      setConfig: (partial) =>
        set((state) => ({ config: { ...state.config, ...partial } })),
      resetConfig: () => set({ config: { ...CFG } }),
    }),
    {
      name: "r3e-toolbox-config",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
