import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { authAPI } from '../services/api';
import { resolveMediaUrl } from '../utils/media';

export default function CashierProfile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('userId').then(id => setUserId(id));
    authAPI.getProfile()
      .then(res => setUser(res.data))
      .catch(() => Alert.alert('Error', 'Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handleUploadQr = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('gcash_qr', {
      uri: asset.uri,
      name: 'gcash_qr.jpg',
      type: 'image/jpeg',
    } as any);

    setUploading(true);
    try {
      const res = await authAPI.updateProfileForm(formData);
      setUser(res.data);
      Alert.alert('Success', 'GCash QR updated successfully!');
    } catch {
      Alert.alert('Error', 'Failed to upload GCash QR. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveQr = () => {
    Alert.alert('Remove QR', 'Are you sure you want to remove your GCash QR?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setUploading(true);
          try {
            const formData = new FormData();
            formData.append('gcash_qr', '');
            const res = await authAPI.updateProfileForm(formData);
            setUser(res.data);
          } catch {
            Alert.alert('Error', 'Failed to remove GCash QR.');
          } finally {
            setUploading(false);
          }
        }
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ED1C24" />
      </View>
    );
  }

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();
  const gcashQrUrl = resolveMediaUrl(user?.gcash_qr);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBack}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.fullName}>{user?.first_name} {user?.last_name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Cashier</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <InfoRow label="Username" value={`@${user?.username}`} />
          <InfoRow label="Email" value={user?.email} />
          <InfoRow label="Phone" value={user?.phone || '—'} />
          <InfoRow label="Address" value={user?.address || '—'} last />
        </View>

        {/* Change MPIN */}
        <TouchableOpacity
          style={styles.mpinBtn}
          onPress={() => router.push({ pathname: '/mpin-setup', params: { userType: 'CASHIER', userId: String(user?.id ?? userId), isUpdate: 'true' } })}
        >
          <Text style={styles.mpinBtnText}>🔐 Change MPIN</Text>
        </TouchableOpacity>

        {/* GCash QR */}
        <Text style={styles.sectionTitle}>📱 GCash QR Code</Text>
        <Text style={styles.sectionSub}>This QR will be shown to customers when they pay via GCash at the branch.</Text>

        <View style={styles.qrCard}>
          {gcashQrUrl ? (
            <>
              <Image source={{ uri: gcashQrUrl }} style={styles.qrImage} resizeMode="contain" />
              <View style={styles.qrActions}>
                <TouchableOpacity style={styles.qrChangeBtn} onPress={handleUploadQr} disabled={uploading}>
                  <Text style={styles.qrChangeBtnText}>{uploading ? 'Uploading...' : '🔄 Change QR'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.qrRemoveBtn} onPress={handleRemoveQr} disabled={uploading}>
                  <Text style={styles.qrRemoveBtnText}>🗑 Remove</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.qrEmpty}>No GCash QR uploaded yet</Text>
              <TouchableOpacity style={styles.qrUploadBtn} onPress={handleUploadQr} disabled={uploading}>
                <Text style={styles.qrUploadBtnText}>{uploading ? 'Uploading...' : '📤 Upload GCash QR'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#ED1C24' },
  headerBack: { fontSize: 26, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ED1C24', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  fullName: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 6 },
  roleBadge: { backgroundColor: '#FFF0F0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#ED1C24' },
  roleBadgeText: { fontSize: 12, color: '#ED1C24', fontWeight: '600' },

  infoCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 24, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel: { fontSize: 13, color: '#999', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600', maxWidth: '65%', textAlign: 'right' },

  mpinBtn: { backgroundColor: '#1a1a1a', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  mpinBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#ED1C24', marginBottom: 4 },
  sectionSub: { fontSize: 12, color: '#999', marginBottom: 14 },

  qrCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
  qrImage: { width: 220, height: 220, borderRadius: 10, marginBottom: 16 },
  qrActions: { flexDirection: 'row', gap: 10 },
  qrChangeBtn: { flex: 1, backgroundColor: '#007AFF', padding: 12, borderRadius: 10, alignItems: 'center' },
  qrChangeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  qrRemoveBtn: { flex: 1, backgroundColor: '#FFF0F0', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ED1C24' },
  qrRemoveBtnText: { color: '#ED1C24', fontWeight: '600', fontSize: 14 },
  qrEmpty: { fontSize: 14, color: '#999', marginBottom: 16 },
  qrUploadBtn: { backgroundColor: '#007AFF', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 10 },
  qrUploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
