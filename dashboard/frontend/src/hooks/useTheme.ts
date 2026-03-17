import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ThemeState {
  dark: boolean
  toggle: () => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      dark: true,
      toggle: () =>
        set((s) => {
          const next = !s.dark
          document.documentElement.classList.toggle("dark", next)
          return { dark: next }
        }),
    }),
    {
      name: "theme",
      onRehydrateStorage: () => (state) => {
        if (state?.dark !== false) document.documentElement.classList.add("dark")
        else document.documentElement.classList.remove("dark")
      },
    }
  )
)
