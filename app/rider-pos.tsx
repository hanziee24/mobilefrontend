import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { deliveryAPI, paymentAPI, authAPI, API_URL } from '../services/api';

export default function RiderPOS() {
  const { id, next } = useLocalSearchParams<{ id: string; next?: string }>();
  const [delivery, setDelivery] = useState<any>(null);
  const [method, setMethod] = useState<'COD' | 'GCASH'>('COD');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ amount: string; method: string; tracking: string; collectedAt: string } | null>(null);
  const [showGcash, setShowGcash] = useState(false);
  const [gcashProof, setGcashProof] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [riderProfile, setRiderProfile] = useState<any>(null);
  const continueToProof = next === 'proof';

  useEffect(() => {
    authAPI.getProfile().then(res => setRiderProfile(res.data)).catch(() => {});
    if (id) {
      deliveryAPI.getDelivery(Number(id))
        .then(res => setDelivery(res.data))
        .catch(() => Alert.alert('Error', 'Failed to load delivery'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id]);

  const handleCollect = async () => {
    if (!delivery) return;

    // GCash — show rider's own GCash details
    if (method === 'GCASH') {
      setShowGcash(true);
      return;
    }

    // COD flow
    Alert.alert(
      'Confirm Collection',
      `Collect ₱${delivery.delivery_fee} via ${method} from ${delivery.receiver_name || 'customer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSubmitting(true);
            try {
              if (delivery.payment) {
                await paymentAPI.confirmPayment(delivery.payment.id);
              } else {
                const res = await paymentAPI.collectCOD(delivery.id, method);
                await paymentAPI.confirmPayment(res.data.payment_id);
              }
              setReceipt({
                amount: delivery.delivery_fee,
                method,
                tracking: delivery.tracking_number,
                collectedAt: new Date().toLocaleString(),
              });
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to record payment');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleDone = () => {
    if (continueToProof) {
      router.replace({ pathname: '/proof-of-delivery', params: { id: String(delivery?.id || id) } } as any);
      return;
    }
    router.back();
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#ED1C24" />
    </View>
  );

  // ── GCash Info Screen ──
  if (showGcash) return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowGcash(false)}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>GCash Payment</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={styles.receiptWrap}>
        <View style={[styles.successCircle, { backgroundColor: '#0070E0' }]}>
          <Text style={{ fontSize: 44 }}>📱</Text>
        </View>
        <Text style={styles.successTitle}>Receive via GCash</Text>
        <Text style={styles.successSub}>Ask the receiver to send payment to your GCash:</Text>

        <View style={styles.receiptCard}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Your Name</Text>
            <Text style={styles.receiptValue}>
              {riderProfile ? `${riderProfile.first_name} ${riderProfile.last_name}`.trim() : '—'}
            </Text>
          </View>
          <View style={styles.receiptDivider} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Your GCash Number</Text>
            <Text style={[styles.receiptValue, { fontSize: 18, color: '#0070E0', fontWeight: 'bold' }]}>
              {riderProfile?.phone || '—'}
            </Text>
          </View>
          <View style={styles.receiptDivider} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Amount to Receive</Text>
            <Text style={styles.receiptAmount}>₱{parseFloat(delivery?.delivery_fee || '0').toFixed(2)}</Text>
          </View>
        </View>

        {riderProfile?.gcash_qr && (
          <View style={styles.receiptCard}>
            <Text style={[styles.receiptLabel, { textAlign: 'center', marginBottom: 10 }]}>Your GCash QR Code</Text>
            <Image
              source={{ uri: `${API_URL.replace('/api', '')}${riderProfile.gcash_qr}` }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.uploadBtn, gcashProof && styles.uploadBtnDone]}
          onPress={async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission required', 'Camera access is needed to capture the GCash receipt.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
            });
            if (!result.canceled) setGcashProof(result.assets[0].uri);
          }}
        >
          <Text style={styles.uploadBtnText}>{gcashProof ? '✓ Photo Captured' : '📷 Capture GCash Receipt'}</Text>
        </TouchableOpacity>

        {gcashProof && (
          <Image source={{ uri: gcashProof }} style={styles.proofPreview} resizeMode="cover" />
        )}

        <TouchableOpacity
          style={[styles.doneBtn, (!gcashProof || uploadingProof) && styles.disabled]}
          disabled={!gcashProof || uploadingProof}
          onPress={async () => {
            if (!gcashProof || !delivery) return;
            setUploadingProof(true);
            try {
              const formData = new FormData();
              formData.append('gcash_proof', { uri: gcashProof, name: 'gcash_proof.jpg', type: 'image/jpeg' } as any);
              await deliveryAPI.uploadGcashProof(delivery.id, formData);
              if (delivery.payment) {
                await paymentAPI.confirmPayment(delivery.payment.id);
              } else {
                const res = await paymentAPI.collectCOD(delivery.id, 'GCASH');
                await paymentAPI.confirmPayment(res.data.payment_id);
              }
              setReceipt({
                amount: delivery.delivery_fee,
                method: 'GCASH',
                tracking: delivery.tracking_number,
                collectedAt: new Date().toLocaleString(),
              });
              setShowGcash(false);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to upload proof');
            } finally {
              setUploadingProof(false);
            }
          }}
        >
          {uploadingProof
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.doneBtnText}>Confirm GCash Payment</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // ── Receipt / Confirmation Screen ──
  if (receipt) return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 30 }} />
        <Text style={styles.title}>Payment Collected</Text>
        <View style={{ width: 30 }} />
      </View>
      <View style={styles.receiptWrap}>
        <View style={styles.successCircle}>
          <Text style={styles.successIcon}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Cash Collected!</Text>
        <Text style={styles.successSub}>COD payment confirmed successfully</Text>

        <View style={styles.receiptCard}>
          <Text style={styles.receiptTitle}>Receipt</Text>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Tracking No.</Text>
            <Text style={styles.receiptValue}>{receipt.tracking}</Text>
          </View>
          <View style={styles.receiptDivider} />

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Receiver</Text>
            <Text style={styles.receiptValue}>{delivery?.receiver_name || '—'}</Text>
          </View>
          <View style={styles.receiptDivider} />

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Payment Method</Text>
            <Text style={styles.receiptValue}>{receipt.method === 'COD' ? '💵 Cash' : receipt.method === 'GCASH' ? '📱 GCash' : '💳 PayMaya'}</Text>
          </View>
          <View style={styles.receiptDivider} />

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Collected At</Text>
            <Text style={styles.receiptValue}>{receipt.collectedAt}</Text>
          </View>
          <View style={styles.receiptDivider} />

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Amount</Text>
            <Text style={styles.receiptAmount}>₱{parseFloat(receipt.amount).toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>{continueToProof ? 'Continue to Proof of Delivery' : 'Done'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Collection Screen ──
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Collect Payment</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.orderCard}>
          <Text style={styles.orderId}>{delivery?.tracking_number || 'No delivery selected'}</Text>
          <Text style={styles.customer}>{delivery?.receiver_name || '—'}</Text>
          <Text style={styles.address}>{delivery?.delivery_address || '—'}</Text>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.label}>Amount to Collect</Text>
          <Text style={styles.amount}>₱{delivery?.delivery_fee || '0.00'}</Text>
        </View>

        <View style={styles.methodCard}>
          <Text style={styles.label}>Payment Method</Text>
          {([
            { key: 'COD', icon: '💵', text: 'Cash (COD)' },
            { key: 'GCASH', icon: '📱', text: 'GCash' },
          ] as const).map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.methodOption, method === opt.key && styles.selected]}
              onPress={() => setMethod(opt.key)}
            >
              <Text style={styles.methodIcon}>{opt.icon}</Text>
              <Text style={styles.methodText}>{opt.text}</Text>
              {method === opt.key && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.collectButton, (!delivery || submitting) && styles.disabled]}
          onPress={handleCollect}
          disabled={!delivery || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.collectText}>Collect Payment</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: { fontSize: 28, color: '#333' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  content: { flex: 1, padding: 15 },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderId: { fontSize: 18, fontWeight: 'bold', color: '#ED1C24', marginBottom: 5 },
  customer: { fontSize: 16, color: '#333', fontWeight: '600', marginBottom: 4 },
  address: { fontSize: 13, color: '#666', textAlign: 'center' },
  amountCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: { fontSize: 14, color: '#999', marginBottom: 8 },
  amount: { fontSize: 40, fontWeight: 'bold', color: '#ED1C24' },
  methodCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#f9f9f9',
  },
  selected: { borderColor: '#ED1C24', backgroundColor: '#FFF0F0' },
  methodIcon: { fontSize: 24, marginRight: 12 },
  methodText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#333' },
  check: { fontSize: 20, color: '#ED1C24' },
  collectButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabled: { backgroundColor: '#ccc' },
  collectText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  receiptWrap: {
    flex: 1, alignItems: 'center', padding: 20, paddingTop: 30,
  },
  successCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  successIcon: { fontSize: 44, color: '#fff', fontWeight: 'bold' },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  successSub: { fontSize: 14, color: '#999', marginBottom: 24 },
  receiptCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    width: '100%', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  receiptTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#333',
    marginBottom: 14, textAlign: 'center',
  },
  receiptRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
  },
  receiptDivider: { height: 1, backgroundColor: '#f0f0f0' },
  receiptLabel: { fontSize: 13, color: '#999' },
  receiptValue: { fontSize: 13, fontWeight: '600', color: '#333', maxWidth: '60%', textAlign: 'right' },
  receiptAmount: { fontSize: 20, fontWeight: 'bold', color: '#4CAF50' },
  doneBtn: {
    backgroundColor: '#ED1C24', padding: 16, borderRadius: 12,
    alignItems: 'center', width: '100%',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  uploadBtn: {
    backgroundColor: '#0070E0', padding: 14, borderRadius: 12,
    alignItems: 'center', width: '100%', marginBottom: 12,
  },
  uploadBtnDone: { backgroundColor: '#4CAF50' },
  uploadBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  proofPreview: {
    width: '100%', height: 160, borderRadius: 12, marginBottom: 12,
  },
  qrImage: {
    width: '100%', height: 220, borderRadius: 8,
  },
});
