import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Language, translations, defaultLanguage, Translations } from './translations'

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
  t: Translations
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: defaultLanguage,
      t: translations[defaultLanguage],
      
      setLanguage: (language: Language) => {
        set({ 
          language, 
          t: translations[language] 
        })
      },
      
      toggleLanguage: () => {
        const currentLang = get().language
        const newLang: Language = currentLang === 'zh' ? 'en' : 'zh'
        set({ 
          language: newLang, 
          t: translations[newLang] 
        })
      },
    }),
    {
      name: 'allergy-ai-language',
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, make sure translations are synced
        if (state) {
          state.t = translations[state.language]
        }
      },
    }
  )
)

// Hook for easier access to translations
export function useTranslation() {
  const { language, setLanguage, toggleLanguage, t } = useLanguageStore()
  return { language, setLanguage, toggleLanguage, t }
}

