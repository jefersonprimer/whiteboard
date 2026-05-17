import { useTranslation } from 'react-i18next';

export function useTranslations(namespace: string) {
  const { t } = useTranslation(namespace);
  return t;
}

export function useLocale() {
  const { i18n } = useTranslation();
  return i18n.language;
}
