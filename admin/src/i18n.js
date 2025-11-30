import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      welcome: 'Welcome to the Admin Dashboard',
      analytics: 'Analytics',
      users: 'Users',
    },
  },
  es: {
    translation: {
      welcome: 'Bienvenido al Panel de Administración',
      analytics: 'Analíticas',
      users: 'Usuarios',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;