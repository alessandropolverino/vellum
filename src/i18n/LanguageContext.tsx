import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'it';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  /** Helper to return the English or Italian string based on active language */
  tr: (en: string, it: string) => string;
}

const LANG_STORAGE_KEY = 'vellum_ui_lang';

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  tr: (en) => en,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'it') return saved;
    } catch {
      // ignore storage errors
    }
    return 'en';
  });

  const setLang = (next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const tr = (en: string, it: string): string => (lang === 'it' ? it : en);

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
