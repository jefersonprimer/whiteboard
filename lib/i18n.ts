import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../messages/en.json';
import ptBR from '../messages/pt-BR.json';

const namespaces = Object.keys(en);

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: en as Record<string, Record<string, unknown>>,
      'pt-BR': ptBR as Record<string, Record<string, unknown>>,
    },
    ns: namespaces,
    defaultNS: 'Sidebar',
    fallbackLng: 'en',
    supportedLngs: ['en', 'pt-BR'],
    interpolation: {
      escapeValue: false,
      prefix: '{',
      suffix: '}',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
