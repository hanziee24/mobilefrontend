import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function MpinSetup() {
  const { userType, userId, isUpdate } = useLocalSearchParams<{ userType: string; userId: string; isUpdate?: string }>();
  const updating = isUpdate === 'true';
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'verify' | 'set' | 'confirm'>(updating ? 'verify' : 'set');

  const handleKey = (key: string) => {
    if (key === '') return;
    if (key === '⌫') {
      if (step === 'verify' || step === 'set') setPin(p => p.slice(0, -1));
      else setConfirmPin(p => p.slice(0, -1));
      return;
    }
    if (step === 'verify') {
      if (pin.length >= 6) return;
      const newPin = pin + key;
      setPin(newPin);
      if (newPin.length === 6) setTimeout(() => handleVerifyOld(newPin), 300);
    } else if (step === 'set') {
      if (pin.length >= 6) return;
      const newPin = pin + key;
      setPin(newPin);
      if (newPin.length === 6) setTimeout(() => setStep('confirm'), 300);
    } else {
      if (confirmPin.length >= 6) return;
      const newConfirm = confirmPin + key;
      setConfirmPin(newConfirm);
      if (newConfirm.length === 6) setTimeout(() => handleConfirm(newConfirm), 300);
    }
  };

  const handleVerifyOld = async (enteredPin: string) => {
    const stored = await AsyncStorage.getItem(`mpin_${userId}`);
    if (enteredPin !== stored) {
      Alert.alert('Incorrect MPIN', 'The current MPIN you entered is wrong. Please try again.');
      setPin('');
      return;
    }
    setPin('');
    setStep('set');
  };

  const handleConfirm = async (confirmedPin: string) => {
    if (confirmedPin !== pin) {
      Alert.alert('Mismatch', 'PINs do not match. Please try again.');
      setPin('');
      setConfirmPin('');
      setStep('set');
      return;
    }
    await AsyncStorage.setItem(`mpin_${userId}`, pin);
    await AsyncStorage.setItem(`mpin_set_${userId}`, 'true');
    Alert.alert('✅ MPIN Set', 'Your MPIN has been set successfully!', [
      {
        text: 'Continue',
        onPress: () => {
          if (userType === 'RIDER') router.replace('/rider-dashboard');
          else router.replace('/cashier-dashboard');
        },
      },
    ]);
  };

  const currentPin = step === 'confirm' ? confirmPin : pin;

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>JRNZ</Text>
          <Text style={styles.logoSub}>Tracking Express</Text>
        </View>
        <Text style={styles.title}>{updating ? 'Change Your MPIN' : 'Set Up Your MPIN'}</Text>
        <Text style={styles.subtitle}>
          {step === 'verify'
            ? 'Enter your current MPIN to continue'
            : step === 'set'
            ? 'Create a new 6-digit PIN'
            : 'Re-enter your new PIN to confirm'}
        </Text>

        <View style={styles.dotsRow}>
          {[0,1,2,3,4,5].map(i => (
            <View key={i} style={[styles.dot, i < currentPin.length && styles.dotFilled]} />
          ))}
        </View>

        {step === 'confirm' && (
          <TouchableOpacity onPress={() => { setStep('set'); setPin(''); setConfirmPin(''); }}>
            <Text style={styles.backLink}>← Change PIN</Text>
          </TouchableOpacity>
        )}
        {updating && step === 'verify' && (
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.keypad}>
        {KEYS.map((key, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, key === '' && styles.keyEmpty]}
            onPress={() => handleKey(key)}
            disabled={key === ''}
          >
            <Text style={[styles.keyText, key === '⌫' && styles.keyBackspace]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ED1C24', justifyContent: 'space-between', paddingBottom: 40 },
  top: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
  logoBox: { alignItems: 'center', marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  logoText: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  logoSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600', letterSpacing: 1, marginTop: 2 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20, marginBottom: 40 },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: '#fff', borderColor: '#fff' },
  backLink: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 8, opacity: 0.9 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 40, gap: 16, justifyContent: 'center' },
  key: { width: 75, height: 75, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  keyEmpty: { backgroundColor: 'transparent', borderWidth: 0 },
  keyText: { fontSize: 26, fontWeight: '600', color: '#fff' },
  keyBackspace: { fontSize: 22 },
});
