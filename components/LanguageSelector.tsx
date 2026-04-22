import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, language === 'en' && styles.btnActive]}
        onPress={() => setLanguage('en')}
      >
        <Text style={[styles.text, language === 'en' && styles.textActive]}>EN</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, language === 'tl' && styles.btnActive]}
        onPress={() => setLanguage('tl')}
      >
        <Text style={[styles.text, language === 'tl' && styles.textActive]}>TL</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
  },
  btnActive: {
    backgroundColor: '#ED1C24',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  textActive: {
    color: '#fff',
  },
});
