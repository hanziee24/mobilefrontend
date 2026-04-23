import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { trackingAPI } from '../services/api';

const STEPS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'PICKED_UP', label: 'Picked Up' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  PICKED_UP: 1,
  IN_TRANSIT: 2,
  OUT_FOR_DELIVERY: 2,
  DELIVERED: 3,
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Delivery Failed',
  CANCELLED: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  DELIVERED: '#16a34a',
  FAILED: '#dc2626',
  CANCELLED: '#6b7280',
};

export default function GuestTracking() {
  const { tracking } = useLocalSearchParams<{ tracking: string }>();
  const [trackingNumber, setTrackingNumber] = useState(tracking || '');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [camPermission, setCamPermission] = useState<boolean | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    if (tracking?.trim()) handleTrack(tracking.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCamPermission(status === 'granted');
    scannedRef.current = false;
    setScanning(true);
  };

  const handleScan = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanning(false);
    setTrackingNumber(data);
  };

  const handleTrack = async (overrideNumber?: string) => {
    const trimmed = (overrideNumber || trackingNumber).trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await trackingAPI.trackByNumber(trimmed);
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Tracking number not found.');
    } finally {
      setLoading(false);
    }
  };

  const current = result ? (STATUS_ORDER[result.status] ?? -1) : -1;
  const statusColor = result ? (STATUS_COLOR[result.status] || '#ED1C24') : '#ED1C24';

  const trackingCard = (
    <View style={styles.card}>
      <Text style={styles.label}>Tracking Number</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="e.g. TRK-1234567890"
          value={trackingNumber}
          onChangeText={setTrackingNumber}
          autoCapitalize="characters"
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
          onSubmitEditing={() => handleTrack()}
        />
        <TouchableOpacity style={styles.scanBtn} onPress={openScanner}>
          <Text style={styles.scanBtnText}>QR</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => handleTrack()} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Track</Text>}
      </TouchableOpacity>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFE5E5', '#FFF6F5', '#F8F9FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topBg}
      >
        <View style={styles.blobA} />
        <View style={styles.blobB} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Track Package</Text>
        </View>
      </LinearGradient>

      {!result ? (
        <View style={styles.centeredArea}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Where&apos;s your parcel?</Text>
            <Text style={styles.heroSubtitle}>Check status in seconds with your tracking number.</Text>
          </View>
          {trackingCard}
          <TouchableOpacity onPress={() => router.push('/auth')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>
              Have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {trackingCard}
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.trackingNum}>{result.tracking_number}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                  {STATUS_LABEL[result.status] || result.status}
                </Text>
              </View>
            </View>

            {result.estimated_time && <Text style={styles.eta}>Estimated arrival: {result.estimated_time}</Text>}

            <View style={styles.timeline}>
              {STEPS.map((step, i) => {
                const done = i <= current;
                return (
                  <View key={step.key} style={styles.stepWrap}>
                    {i > 0 && <View style={[styles.connector, done && styles.connectorDone]} />}
                    <View style={styles.dotWrap}>
                      <View style={[styles.dot, done && styles.dotDone]} />
                      <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.divider} />

            <View style={styles.addressRow}>
              <View style={styles.addressDot} />
              <View style={styles.addressBlock}>
                <Text style={styles.addressLabel}>From</Text>
                <Text style={styles.addressValue}>{result.pickup_address?.split('|')[0] || 'N/A'}</Text>
              </View>
            </View>
            <View style={[styles.addressRow, { marginTop: 12 }]}>
              <View style={[styles.addressDot, styles.addressDotDest]} />
              <View style={styles.addressBlock}>
                <Text style={styles.addressLabel}>To</Text>
                <Text style={styles.addressValue}>{result.delivery_address?.split('|')[0] || 'N/A'}</Text>
              </View>
            </View>

            {result.rider_name && (
              <>
                <View style={styles.divider} />
                <View style={styles.riderRow}>
                  <Text style={styles.riderLabel}>Rider</Text>
                  <Text style={styles.riderName}>{result.rider_name}</Text>
                </View>
              </>
            )}

            {(result.status === 'FAILED' || result.status === 'CANCELLED') && (
              <View style={styles.exceptionRow}>
                <Text style={styles.exceptionText}>
                  {result.status === 'FAILED'
                    ? `Delivery failed${result.failure_reason ? `: ${result.failure_reason}` : ''}`
                    : 'This delivery has been cancelled.'}
                </Text>
              </View>
            )}

            <Text style={styles.updatedAt}>Updated {new Date(result.updated_at).toLocaleString()}</Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/auth')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>
              Have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={scanning} animationType="slide">
        <View style={styles.scanModal}>
          <View style={styles.scanHeader}>
            <TouchableOpacity onPress={() => setScanning(false)}>
              <Text style={styles.scanClose}>X</Text>
            </TouchableOpacity>
            <Text style={styles.scanTitle}>Scan Barcode</Text>
            <View style={{ width: 32 }} />
          </View>
          {camPermission === false ? (
            <View style={styles.scanDenied}>
              <Text style={styles.scanDeniedText}>Camera permission denied</Text>
            </View>
          ) : (
            <CameraView
              style={{ flex: 1 }}
              onBarcodeScanned={handleScan}
              barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'] }}
            >
              <View style={styles.scanOverlay}>
                <View style={styles.scanBox} />
                <Text style={styles.scanHint}>Align barcode within the frame</Text>
              </View>
            </CameraView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { paddingBottom: 24 },
  centeredArea: { flex: 1, justifyContent: 'flex-start', paddingTop: 14, paddingBottom: 26 },
  topBg: { overflow: 'hidden' },
  blobA: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(237,28,36,0.08)',
    right: -60,
    top: -60,
  },
  blobB: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(237,28,36,0.06)',
    left: -40,
    bottom: -50,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  backBtn: { marginRight: 16 },
  backText: { fontSize: 15, color: '#ED1C24', fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  heroCopy: { marginHorizontal: 22, marginBottom: 10 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#1f2937', marginBottom: 4 },
  heroSubtitle: { fontSize: 13, color: '#6b7280' },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  scanBtn: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    minWidth: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  scanBtnText: { fontSize: 13, color: '#374151', fontWeight: '700' },
  button: {
    backgroundColor: '#ED1C24',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  error: { color: '#dc2626', marginTop: 10, fontSize: 13, textAlign: 'center' },

  resultCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  trackingNum: { fontSize: 16, fontWeight: '700', color: '#111', flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  eta: { fontSize: 13, color: '#6b7280', marginBottom: 10 },

  timeline: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  stepWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dotWrap: { alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e5e7eb' },
  dotDone: { backgroundColor: '#ED1C24' },
  connector: { flex: 1, height: 2, backgroundColor: '#e5e7eb' },
  connectorDone: { backgroundColor: '#ED1C24' },
  stepLabel: { fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
  stepLabelDone: { color: '#ED1C24', fontWeight: '600' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 10 },

  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  addressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a', marginTop: 5 },
  addressDotDest: { backgroundColor: '#ED1C24' },
  addressBlock: { flex: 1 },
  addressLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  addressValue: { fontSize: 14, color: '#111', fontWeight: '500' },

  riderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  riderLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  riderName: { fontSize: 14, color: '#111', fontWeight: '500' },

  exceptionRow: { marginTop: 14, backgroundColor: '#fef2f2', borderRadius: 8, padding: 12 },
  exceptionText: { fontSize: 13, color: '#dc2626' },

  updatedAt: { fontSize: 11, color: '#d1d5db', marginTop: 10, textAlign: 'right' },

  loginLink: { alignItems: 'center', marginTop: 14 },
  loginLinkText: { fontSize: 14, color: '#9ca3af' },
  loginLinkBold: { color: '#ED1C24', fontWeight: '600' },

  scanModal: { flex: 1, backgroundColor: '#000' },
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#000',
  },
  scanClose: { color: '#fff', fontSize: 18, fontWeight: '300' },
  scanTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scanDenied: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanDeniedText: { color: '#9ca3af', fontSize: 14 },
  scanOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  scanBox: { width: 240, height: 160, borderWidth: 2, borderColor: '#ED1C24', borderRadius: 10, marginBottom: 20 },
  scanHint: { color: '#d1d5db', fontSize: 13 },
});
