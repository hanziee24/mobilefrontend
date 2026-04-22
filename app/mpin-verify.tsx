import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
const MAX_ATTEMPTS = 3;

export default function MpinVerify() {
  const { userType, userId } = useLocalSearchParams<{ userType: string; userId: string }>();
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleKey = (key: string) => {
    if (key === '') return;
    if (key === '⌫') { setPin(p => p.slice(0, -1)); return; }
    if (pin.length >= 6) return;
    const newPin = pin + key;
    setPin(newPin);
    if (newPin.length === 6) setTimeout(() => handleVerify(newPin), 300);
  };

  const handleVerify = async (enteredPin: string) => {
    const savedPin = await AsyncStorage.getItem(`mpin_${userId}`);
    if (enteredPin === savedPin) {
      if (userType === 'RIDER') router.replace('/rider-dashboard');
      else router.replace('/cashier-dashboard');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');
      if (newAttempts >= MAX_ATTEMPTS) {
        Alert.alert(
          '🔒 Too Many Attempts',
          'You have entered the wrong PIN 3 times. You will be logged out for security.',
          [{
            text: 'OK',
            onPress: async () => {
              await authAPI.logout();
              router.replace('/auth');
            },
          }]
        );
      } else {
        Alert.alert('Incorrect PIN', `Wrong PIN. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.`);
      }
    }
  };

  const handleForgotPin = () => setForgotVisible(true);

  const handleResetMpin = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      const res = await authAPI.resetMpin(trimmed);
      const { mpin, user_id } = res.data;
      await AsyncStorage.setItem(`mpin_${user_id}`, mpin);
      await AsyncStorage.setItem(`mpin_set_${user_id}`, 'true');
      setForgotVisible(false);
      setEmail('');
      Alert.alert('✅ MPIN Sent', 'A new MPIN has been sent to your email. Use it to log in, then change it immediately.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to reset MPIN. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>JRNZ</Text>
          <Text style={styles.logoSub}>Tracking Express</Text>
        </View>
        <Text style={styles.title}>Enter Your MPIN</Text>
        <Text style={styles.subtitle}>Enter your 6-digit PIN to continue</Text>

        <View style={styles.dotsRow}>
          {[0,1,2,3,4,5].map(i => (
            <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
          ))}
        </View>

        {attempts > 0 && (
          <Text style={styles.attemptsText}>
            ⚠️ {MAX_ATTEMPTS - attempts} attempt(s) remaining
          </Text>
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

      <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPin}>
        <Text style={styles.forgotText}>Forgot MPIN?</Text>
      </TouchableOpacity>

      <Modal visible={forgotVisible} transparent animationType="fade" onRequestClose={() => setForgotVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reset MPIN</Text>
            <Text style={styles.modalSub}>Enter your registered email and we'll send you a new MPIN.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Your email address"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.modalBtn, sending && styles.modalBtnDisabled]}
              onPress={handleResetMpin}
              disabled={sending}
            >
              {sending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalBtnText}>Send New MPIN</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setForgotVisible(false); setEmail(''); }} disabled={sending}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ED1C24', justifyContent: 'space-between', paddingBottom: 30 },
  top: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
  logoBox: { alignItems: 'center', marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  logoText: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  logoSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600', letterSpacing: 1, marginTop: 2 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20, marginBottom: 40 },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: '#fff', borderColor: '#fff' },
  attemptsText: { fontSize: 13, color: '#FFE082', marginTop: 8, fontWeight: '600' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 40, gap: 16, justifyContent: 'center' },
  key: { width: 75, height: 75, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  keyEmpty: { backgroundColor: 'transparent', borderWidth: 0 },
  keyText: { fontSize: 26, fontWeight: '600', color: '#fff' },
  keyBackspace: { fontSize: 22 },
  forgotBtn: { alignItems: 'center', paddingVertical: 10 },
  forgotText: { color: '#fff', fontSize: 14, fontWeight: '600', opacity: 0.85 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#ED1C24', marginBottom: 6, textAlign: 'center' },
  modalSub: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 18, lineHeight: 18 },
  modalInput: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#222', marginBottom: 14 },
  modalBtn: { backgroundColor: '#ED1C24', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  modalBtnDisabled: { backgroundColor: '#f0a0a0' },
  modalBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalCancel: { textAlign: 'center', color: '#999', fontSize: 14, fontWeight: '600', paddingVertical: 6 },
});
