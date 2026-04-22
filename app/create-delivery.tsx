import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { deliveryAPI, authAPI, settingsAPI } from '../services/api';
import MapPicker from '../components/MapPicker';
import * as ImagePicker from 'expo-image-picker';
import {
  Info,
  SendHorizontal,
  MapPin,
  Square,
  CheckSquare,
  Camera,
  Package,
  UserRound,
  UserPlus,
  CheckCircle,
} from 'lucide-react-native';

const FLOW_STEPS = [
  { step: 1, label: 'Fill Form', desc: 'Enter parcel details' },
  { step: 2, label: 'Cashier Reviews', desc: 'Fee confirmed & waybill generated' },
  { step: 3, label: 'Rider Picks Up', desc: 'Delivery starts' },
];

function FlowIndicator() {
  return (
    <View style={flowStyles.container}>
      <Text style={flowStyles.title}>How it works</Text>
      <View style={flowStyles.steps}>
        {FLOW_STEPS.map((s, i) => (
          <View key={s.step} style={flowStyles.stepRow}>
            <View style={flowStyles.stepLeft}>
              <View style={[flowStyles.circle, i === 0 && flowStyles.circleActive]}>
                <Text style={[flowStyles.circleText, i === 0 && flowStyles.circleTextActive]}>{s.step}</Text>
              </View>
              {i < FLOW_STEPS.length - 1 && <View style={flowStyles.line} />}
            </View>
            <View style={flowStyles.stepInfo}>
              <Text style={[flowStyles.stepLabel, i === 0 && flowStyles.stepLabelActive]}>{s.label}</Text>
              <Text style={flowStyles.stepDesc}>{s.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function CreateDelivery() {
  const [submitted, setSubmitted] = useState(false);
  const [trackingHint, setTrackingHint] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderContact, setSenderContact] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverContact, setReceiverContact] = useState('');
  const [itemType, setItemType] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'g' | 'lbs' | 'oz'>('kg');
  const [quantity, setQuantity] = useState('');
  const [isFragile, setIsFragile] = useState(false);
  const [packagePhoto, setPackagePhoto] = useState<string | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [preferredPayment, setPreferredPayment] = useState<'CASH' | 'GCASH' | 'MAYA' | 'BANK_TRANSFER' | 'CREDIT_CARD'>('CASH');
  const [loading, setLoading] = useState(false);
  const [feeConfig, setFeeConfig] = useState({ base_fee: 50, per_kg_rate: 15, per_item_rate: 10 });
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerType, setMapPickerType] = useState<'sender' | 'receiver'>('sender');

  useEffect(() => {
    authAPI.validateToken().then(valid => {
      if (!valid) Alert.alert('Session Expired', 'Please login again', [{ text: 'OK', onPress: () => router.replace('/auth') }]);
    });
    settingsAPI.getFeeConfig().then(res => {
      setFeeConfig({
        base_fee: parseFloat(res.data.base_fee),
        per_kg_rate: parseFloat(res.data.per_kg_rate),
        per_item_rate: parseFloat(res.data.per_item_rate),
      });
    }).catch(() => {});
  }, []);

  const UNIT_TO_KG: Record<string, number> = { kg: 1, g: 0.001, lbs: 0.453592, oz: 0.0283495 };
  const weightInKg = (parseFloat(weight) || 0) * (UNIT_TO_KG[weightUnit] ?? 1);
  const estimatedFee = weight && quantity
    ? Math.ceil(feeConfig.base_fee + weightInKg * feeConfig.per_kg_rate + (parseInt(quantity) || 0) * feeConfig.per_item_rate)
    : null;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take a package photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setPackagePhoto(result.assets[0].uri);
  };

  const handleSendToCashier = async () => {
    if (!senderName || !senderContact || !receiverName || !receiverContact || !receiverAddress || !itemType || !weight || !quantity) {
      Alert.alert('Missing Fields', 'Please fill in all required fields marked with *');
      return;
    }
    setLoading(true);
    try {
      const res = await deliveryAPI.createDeliveryRequest({
        sender_name: senderName,
        sender_contact: senderContact,
        sender_address: senderAddress.split('|')[0] || senderAddress,
        receiver_name: receiverName,
        receiver_contact: receiverContact,
        receiver_address: receiverAddress.split('|')[0] || receiverAddress,
        item_type: itemType,
        weight: weightInKg.toFixed(3),
        quantity,
        is_fragile: isFragile,
        special_instructions: specialInstructions,
      preferred_payment_method: preferredPayment,
      });
      setTrackingHint(res?.data?.tracking_number || '');
      setSubmitted(true);
    } catch {
      Alert.alert('Error', 'Failed to send request to cashier. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 30 }} />
          <Text style={styles.title}>Request Sent</Text>
          <View style={{ width: 30 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center', paddingBottom: 40 }}>
          <CheckCircle size={72} color="#4CAF50" style={{ marginTop: 20, marginBottom: 16 }} />
          <Text style={styles.successTitle}>Delivery Request Submitted!</Text>
          <Text style={styles.successSub}>Your request has been sent to the cashier. Please proceed to the branch to pay and collect your waybill.</Text>

          <View style={styles.successSteps}>
            {[
              { icon: '✅', text: 'Step 1 done — Request submitted' },
              { icon: '⏳', text: 'Step 2 — Cashier will confirm your fee' },
              { icon: '🚴', text: 'Step 3 — Rider will pick up your parcel' },
            ].map((s, i) => (
              <View key={i} style={styles.successStepRow}>
                <Text style={styles.successStepIcon}>{s.icon}</Text>
                <Text style={[styles.successStepText, i === 0 && { color: '#4CAF50', fontWeight: '700' }]}>{s.text}</Text>
              </View>
            ))}
          </View>

          {trackingHint ? (
            <View style={styles.trackingBox}>
              <Text style={styles.trackingBoxLabel}>Your Request ID</Text>
              <Text style={styles.trackingBoxValue}>{trackingHint}</Text>
              <Text style={styles.trackingBoxNote}>Show this to the cashier when you arrive</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.submitBtn} onPress={() => router.replace('/customer-dashboard')}>
            <Text style={styles.submitBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/delivery-status')}>
            <Text style={styles.secondaryBtnText}>View My Deliveries</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Send Parcel</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <FlowIndicator />
        <View style={styles.infoBanner}>
          <Info size={18} color="#E65100" style={styles.infoBannerIcon} />
          <Text style={styles.infoBannerText}>Fill in your parcel details below. A cashier will confirm your fee and generate the waybill when you arrive at the branch.</Text>
        </View>

        <View style={styles.sectionTitleRow}>
          <UserRound size={17} color="#ED1C24" />
          <Text style={styles.sectionTitle}>Sender Information</Text>
        </View>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} placeholder="Enter sender name" value={senderName} onChangeText={setSenderName} placeholderTextColor="#999" />

        <Text style={styles.label}>Contact Number *</Text>
        <TextInput style={styles.input} placeholder="09XXXXXXXXX" value={senderContact} onChangeText={setSenderContact} keyboardType="phone-pad" placeholderTextColor="#999" />

        <Text style={styles.label}>Address</Text>
        <View style={styles.addressRow}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Enter sender address" value={senderAddress.split('|')[0] || senderAddress} onChangeText={setSenderAddress} placeholderTextColor="#999" />
          <TouchableOpacity style={styles.mapBtn} onPress={() => { setMapPickerType('sender'); setShowMapPicker(true); }}>
            <MapPin size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionTitleRow}>
          <UserPlus size={17} color="#ED1C24" />
          <Text style={styles.sectionTitle}>Receiver Information</Text>
        </View>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} placeholder="Enter receiver name" value={receiverName} onChangeText={setReceiverName} placeholderTextColor="#999" />

        <Text style={styles.label}>Contact Number *</Text>
        <TextInput style={styles.input} placeholder="09XXXXXXXXX" value={receiverContact} onChangeText={setReceiverContact} keyboardType="phone-pad" placeholderTextColor="#999" />

        <Text style={styles.label}>Delivery Address *</Text>
        <View style={styles.addressRow}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Enter delivery address" value={receiverAddress.split('|')[0] || receiverAddress} onChangeText={setReceiverAddress} placeholderTextColor="#999" />
          <TouchableOpacity style={styles.mapBtn} onPress={() => { setMapPickerType('receiver'); setShowMapPicker(true); }}>
            <MapPin size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionTitleRow}>
          <Package size={17} color="#ED1C24" />
          <Text style={styles.sectionTitle}>Parcel Details</Text>
        </View>
        <Text style={styles.label}>Item Type *</Text>
        <TextInput style={styles.input} placeholder="e.g. Documents, Clothes, Electronics" value={itemType} onChangeText={setItemType} placeholderTextColor="#999" />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Weight *</Text>
            <TextInput style={styles.input} placeholder="0.0" value={weight} onChangeText={setWeight} keyboardType="numeric" placeholderTextColor="#999" />
            <View style={styles.unitSelector}>
              {(['kg', 'g', 'lbs', 'oz'] as const).map(u => (
                <TouchableOpacity key={u} style={[styles.unitBtn, weightUnit === u && styles.unitBtnActive]} onPress={() => setWeightUnit(u)}>
                  <Text style={[styles.unitBtnText, weightUnit === u && styles.unitBtnTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput style={styles.input} placeholder="1" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholderTextColor="#999" />
          </View>
        </View>

        <TouchableOpacity style={[styles.fragileBtn, isFragile && styles.fragileBtnActive]} onPress={() => setIsFragile(!isFragile)}>
          {isFragile ? (
            <CheckSquare size={18} color="#FF9800" />
          ) : (
            <Square size={18} color="#888" />
          )}
          <Text style={[styles.fragileText, isFragile && { color: '#FF9800' }]}>Fragile Item - Handle with Care</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Package Photo (Optional)</Text>
        <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
          {packagePhoto ? (
            <View style={{ alignItems: 'center' }}>
              <Image source={{ uri: packagePhoto }} style={styles.photoPreview} />
              <Text style={styles.retakeText}>Tap to Retake</Text>
            </View>
          ) : (
            <View style={styles.photoBtnInner}>
              <Camera size={18} color="#666" />
              <Text style={styles.photoBtnText}>Take Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Special Instructions (Optional)</Text>
        <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} placeholder="e.g. Call before delivery" value={specialInstructions} onChangeText={setSpecialInstructions} multiline placeholderTextColor="#999" />

        {estimatedFee !== null && (
          <View style={styles.feePreview}>
            <Text style={styles.feePreviewLabel}>Estimated Fee</Text>
            <Text style={styles.feePreviewAmount}>₱{estimatedFee.toFixed(2)}</Text>
            <Text style={styles.feePreviewNote}>Final fee will be confirmed by the cashier</Text>
          </View>
        )}

        <View style={styles.sectionTitleRow}>
          <Text style={{ fontSize: 17 }}>💳</Text>
          <Text style={styles.sectionTitle}>Preferred Payment Method</Text>
        </View>
        <Text style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Let the cashier know how you'd like to pay when you arrive.</Text>
        <View style={styles.paymentGrid}>
          {([
            { key: 'CASH', label: '💵 Cash' },
            { key: 'GCASH', label: '📱 GCash' },
            { key: 'MAYA', label: '💜 Maya' },
            { key: 'BANK_TRANSFER', label: '🏦 Bank Transfer' },
            { key: 'CREDIT_CARD', label: '💳 Credit/Debit Card' },
          ] as const).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.paymentBtn, preferredPayment === key && styles.paymentBtnActive]}
              onPress={() => setPreferredPayment(key)}
            >
              <Text style={[styles.paymentBtnText, preferredPayment === key && styles.paymentBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSendToCashier} disabled={loading}>
          <View style={styles.submitBtnInner}>
            {!loading && <SendHorizontal size={18} color="#fff" />}
            <Text style={styles.submitBtnText}>{loading ? 'Sending...' : 'Submit Delivery Request'}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <MapPicker
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelectLocation={(address, lat, lng) => {
          const val = `${address}|${lat},${lng}`;
          if (mapPickerType === 'sender') setSenderAddress(val);
          else setReceiverAddress(val);
          setShowMapPicker(false);
        }}
        initialAddress={mapPickerType === 'sender' ? senderAddress : receiverAddress}
      />
    </View>
  );
}

const flowStyles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  title: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 12 },
  steps: { gap: 0 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  stepLeft: { alignItems: 'center', width: 28, marginRight: 12 },
  circle: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ddd' },
  circleActive: { backgroundColor: '#ED1C24', borderColor: '#ED1C24' },
  circleText: { fontSize: 12, fontWeight: '700', color: '#aaa' },
  circleTextActive: { color: '#fff' },
  line: { width: 2, height: 22, backgroundColor: '#e0e0e0', marginTop: 2 },
  stepInfo: { flex: 1, paddingBottom: 14 },
  stepLabel: { fontSize: 13, fontWeight: '600', color: '#888' },
  stepLabelActive: { color: '#ED1C24' },
  stepDesc: { fontSize: 11, color: '#bbb', marginTop: 1 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  backButton: { fontSize: 28, color: '#333' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
  successSub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  successSteps: { width: '100%', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, gap: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  successStepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  successStepIcon: { fontSize: 18 },
  successStepText: { fontSize: 14, color: '#555' },
  trackingBox: { width: '100%', backgroundColor: '#FFF3E0', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#FF9800' },
  trackingBoxLabel: { fontSize: 11, color: '#E65100', fontWeight: '600', marginBottom: 4 },
  trackingBoxValue: { fontSize: 20, fontWeight: 'bold', color: '#E65100', letterSpacing: 1, marginBottom: 4 },
  trackingBoxNote: { fontSize: 11, color: '#E65100', textAlign: 'center' },
  secondaryBtn: { backgroundColor: '#fff', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#ddd', width: '100%' },
  secondaryBtnText: { color: '#555', fontSize: 15, fontWeight: '600' },
  content: { flex: 1, padding: 15 },
  infoBanner: { backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14, marginBottom: 6, borderLeftWidth: 4, borderLeftColor: '#FF9800', flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoBannerIcon: { marginTop: 1 },
  infoBannerText: { fontSize: 13, color: '#E65100', lineHeight: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#ED1C24' },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 13, backgroundColor: '#fff', fontSize: 15 },
  addressRow: { flexDirection: 'row', gap: 8 },
  mapBtn: { backgroundColor: '#4CAF50', width: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  row: { flexDirection: 'row' },
  unitSelector: { flexDirection: 'row', gap: 6, marginTop: 6 },
  unitBtn: { flex: 1, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fff' },
  unitBtnActive: { borderColor: '#ED1C24', backgroundColor: '#FFF0F0' },
  unitBtnText: { fontSize: 12, fontWeight: '600', color: '#888' },
  unitBtnTextActive: { color: '#ED1C24' },
  fragileBtn: { padding: 14, borderRadius: 10, borderWidth: 2, borderColor: '#ddd', backgroundColor: '#fff', marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fragileBtnActive: { borderColor: '#FF9800', backgroundColor: '#FFF3E0' },
  fragileText: { fontSize: 14, fontWeight: '600', color: '#666' },
  photoBtn: { borderWidth: 2, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 10, padding: 20, alignItems: 'center', backgroundColor: '#f9f9f9' },
  photoBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoBtnText: { fontSize: 15, color: '#666' },
  retakeText: { fontSize: 13, color: '#2196F3', fontWeight: '600', marginTop: 8 },
  photoPreview: { width: '100%', height: 180, borderRadius: 10 },
  feePreview: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20, borderWidth: 2, borderColor: '#ED1C24' },
  feePreviewLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  feePreviewAmount: { fontSize: 30, fontWeight: 'bold', color: '#ED1C24', marginBottom: 4 },
  feePreviewNote: { fontSize: 11, color: '#aaa', fontStyle: 'italic' },
  submitBtn: { backgroundColor: '#ED1C24', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  paymentBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 2, borderColor: '#ddd', backgroundColor: '#fff' },
  paymentBtnActive: { borderColor: '#ED1C24', backgroundColor: '#FFF0F0' },
  paymentBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
  paymentBtnTextActive: { color: '#ED1C24' },
});
