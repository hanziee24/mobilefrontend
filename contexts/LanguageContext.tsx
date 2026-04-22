import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'tl';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    'common.loading': 'Loading...',
    'common.submit': 'Submit',
    'common.cancel': 'Cancel',
    'common.success': 'Success',
    'common.error': 'Error',
    'dashboard.home': 'Home',
    'dashboard.deliveries': 'Deliveries',
    'dashboard.earnings': 'Earnings',
    'dashboard.profile': 'Profile',
    'dashboard.online': 'Online',
    'dashboard.offline': 'Offline',
    'delivery.pickup': 'Pick Up Package',
    'delivery.navigate': 'Navigate',
    'delivery.complete': 'Complete',
    'delivery.sender': 'Sender',
    'delivery.receiver': 'Receiver',
    'delivery.morning': 'Morning',
    'delivery.afternoon': 'Afternoon',
    'delivery.evening': 'Evening',
    'delivery.anytime': 'Anytime',
  },
  tl: {
    'common.loading': 'Naglo-load...',
    'common.submit': 'Ipasa',
    'common.cancel': 'Kanselahin',
    'common.success': 'Tagumpay',
    'common.error': 'May Mali',
    'dashboard.home': 'Home',
    'dashboard.deliveries': 'Mga Delivery',
    'dashboard.earnings': 'Kita',
    'dashboard.profile': 'Profile',
    'dashboard.online': 'Online',
    'dashboard.offline': 'Offline',
    'delivery.pickup': 'Kunin ang Pakete',
    'delivery.navigate': 'Mag-navigate',
    'delivery.complete': 'Tapusin',
    'delivery.sender': 'Nagpadala',
    'delivery.receiver': 'Tatanggap',
    'delivery.morning': 'Umaga',
    'delivery.afternoon': 'Hapon',
    'delivery.evening': 'Gabi',
    'delivery.anytime': 'Kahit Kailan',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    const saved = await AsyncStorage.getItem('language');
    if (saved === 'en' || saved === 'tl') {
      setLanguageState(saved);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
