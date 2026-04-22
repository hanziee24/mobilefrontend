import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { deliveryAPI } from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapPicker from '../components/MapPicker';

interface Package {
  id: number;
  receiverName: string;
  receiverContact: string;
  receiverAddress: string;
  itemType: string;
  weight: string;
  quantity: string;
  isFragile: boolean;
}

const emptyPackage = (id: number): Package => ({
  id,
  receiverName: '',
  receiverContact: '',
  receiverAddress: '',
  itemType: '',
  weight: '',
  quantity: '',
  isFragile: false,
});

const calculateFee = (weight: string, quantity: string) => {
  const w = parseFloat(weight) || 0;
  const q = parseInt(quantity) || 0;
  if (!w || !q) return 0;
  return Math.ceil(50 + w * 15 + q * 10);
};

export default function BulkDelivery() {
  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderContact, setSenderContact] = useState('');
  const [timeSlot, setTimeSlot] = useState<'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANYTIME'>('ANYTIME');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [packages, setPackages] = useState<Package[]>([emptyPackage(1)]);
  const [loading, setLoading] = useState(false);
  const [nextId, setNextId] = useState(2);

  // Map picker state
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState<'sender' | number>('sender');

  const openMap = (target: 'sender' | number) => {
    setMapPickerTarget(target);
    setShowMapPicker(true);
  };

  const handleLocationSelect = (address: string, latitude: number, longitude: number) => {
    const full = `${address}|${latitude},${longitude}`;
    if (mapPickerTarget === 'sender') {
      setSenderAddress(full);
    } else {
      updatePackage(mapPickerTarget as number, 'receiverAddress', full);
    }
  };

  const addPackage = () => {
    setPackages(prev => [...prev, emptyPackage(nextId)]);
    setNextId(n => n + 1);
  };

  const removePackage = (id: number) => {
    if (packages.length === 1) return;
    setPackages(prev => prev.filter(p => p.id !== id));
  };

  const updatePackage = (id: number, field: keyof Package, value: any) => {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const totalFee = packages.reduce((sum, p) => sum + calculateFee(p.weight, p.quantity), 0);

  const handleSubmit = async () => {
    if (!senderName || !senderAddress || !senderContact) {
      Alert.alert('Error', 'Please fill in sender information');
      return;
    }
    for (const p of packages) {
      if (!p.receiverName || !p.receiverAddress || !p.receiverContact || !p.itemType || !p.weight || !p.quantity) {
        Alert.alert('Error', `Please fill in all fields for Package #${packages.indexOf(p) + 1}`);
        return;
      }
    }

    Alert.alert(
      'Confirm Bulk Submission',
      `Submit ${packages.length} package(s)?\nTotal Fee: ₱${totalFee}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit All',
          onPress: async () => {
            setLoading(true);
            let successCount = 0;
            const errors: string[] = [];

            for (const p of packages) {
              try {
                const formData = new FormData();
                formData.append('sender_name', senderName);
                formData.append('sender_address', senderAddress.split('|')[0]);
                formData.append('sender_contact', senderContact);
                formData.append('receiver_name', p.receiverName);
                formData.append('receiver_address', p.receiverAddress.split('|')[0]);
                formData.append('receiver_contact', p.receiverContact);
                formData.append('pickup_address', senderAddress);
                formData.append('delivery_address', p.receiverAddress);
                formData.append('package_details', `${p.itemType} - ${p.weight}kg - Qty: ${p.quantity}${p.isFragile ? ' [FRAGILE]' : ''}`);
                formData.append('delivery_fee', calculateFee(p.weight, p.quantity).toString());
                formData.append('delivery_time_slot', timeSlot);
                formData.append('scheduled_date', formatDate(scheduledDate));
                formData.append('is_fragile', p.isFragile.toString());
                await deliveryAPI.createDelivery(formData);
                successCount++;
              } catch {
                errors.push(p.receiverName);
              }
            }

            setLoading(false);
            if (errors.length === 0) {
              Alert.alert('✅ Success', `${successCount} package(s) submitted for approval!`, [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } else {
              Alert.alert('Partial Success', `${successCount} submitted. Failed: ${errors.join(', ')}`);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bulk Delivery</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>📦 For business customers — one sender, multiple receivers</Text>
        </View>

        {/* Sender Info */}
        <Text style={styles.sectionTitle}>📤 Sender Information (Shared)</Text>

        <Text style={styles.label}>Sender Name *</Text>
        <TextInput style={styles.input} placeholder="Business / Sender name" value={senderName} onChangeText={setSenderName} placeholderTextColor="#999" />

        <Text style={styles.label}>Sender Address *</Text>
        <View style={styles.addressRow}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Pickup address" value={senderAddress.split('|')[0] || senderAddress} onChangeText={setSenderAddress} placeholderTextColor="#999" />
          <TouchableOpacity style={styles.mapBtn} onPress={() => openMap('sender')}>
            <Text style={styles.mapBtnText}>🗺️</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Sender Contact *</Text>
        <TextInput style={styles.input} placeholder="Contact number" value={senderContact} onChangeText={setSenderContact} keyboardType="phone-pad" placeholderTextColor="#999" />

        {/* Schedule */}
        <Text style={styles.sectionTitle}>⏰ Schedule (Shared)</Text>

        <View style={styles.timeSlotGrid}>
          {(['MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME'] as const).map(slot => (
            <TouchableOpacity
              key={slot}
              style={[styles.slotBtn, timeSlot === slot && styles.slotBtnActive]}
              onPress={() => setTimeSlot(slot)}
            >
              <Text style={[styles.slotText, timeSlot === slot && styles.slotTextActive]}>
                {slot === 'MORNING' ? '🌅' : slot === 'AFTERNOON' ? '☀️' : slot === 'EVENING' ? '🌙' : '🕐'} {slot}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateBtnText}>📅 {formatDate(scheduledDate)}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={scheduledDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(_, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setScheduledDate(d); }}
          />
        )}

        {/* Packages */}
        <View style={styles.packagesTitleRow}>
          <Text style={styles.sectionTitle}>📦 Packages ({packages.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={addPackage}>
            <Text style={styles.addBtnText}>+ Add Package</Text>
          </TouchableOpacity>
        </View>

        {packages.map((pkg, index) => (
          <View key={pkg.id} style={styles.packageCard}>
            <View style={styles.packageCardHeader}>
              <Text style={styles.packageCardTitle}>Package #{index + 1}</Text>
              <View style={styles.packageCardHeaderRight}>
                {calculateFee(pkg.weight, pkg.quantity) > 0 && (
                  <Text style={styles.packageFee}>₱{calculateFee(pkg.weight, pkg.quantity)}</Text>
                )}
                {packages.length > 1 && (
                  <TouchableOpacity onPress={() => removePackage(pkg.id)}>
                    <Text style={styles.removeBtn}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <TextInput style={styles.input} placeholder="Receiver Name *" value={pkg.receiverName} onChangeText={v => updatePackage(pkg.id, 'receiverName', v)} placeholderTextColor="#999" />
            <TextInput style={styles.input} placeholder="Receiver Contact *" value={pkg.receiverContact} onChangeText={v => updatePackage(pkg.id, 'receiverContact', v)} keyboardType="phone-pad" placeholderTextColor="#999" />
            <View style={styles.addressRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Delivery Address *" value={pkg.receiverAddress.split('|')[0] || pkg.receiverAddress} onChangeText={v => updatePackage(pkg.id, 'receiverAddress', v)} placeholderTextColor="#999" />
              <TouchableOpacity style={styles.mapBtn} onPress={() => openMap(pkg.id)}>
                <Text style={styles.mapBtnText}>🗺️</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Item Type *" value={pkg.itemType} onChangeText={v => updatePackage(pkg.id, 'itemType', v)} placeholderTextColor="#999" />

            <View style={styles.row}>
              <TextInput style={[styles.input, styles.halfInput]} placeholder="Weight (kg) *" value={pkg.weight} onChangeText={v => updatePackage(pkg.id, 'weight', v)} keyboardType="numeric" placeholderTextColor="#999" />
              <TextInput style={[styles.input, styles.halfInput]} placeholder="Quantity *" value={pkg.quantity} onChangeText={v => updatePackage(pkg.id, 'quantity', v)} keyboardType="numeric" placeholderTextColor="#999" />
            </View>

            <TouchableOpacity
              style={[styles.fragileBtn, pkg.isFragile && styles.fragileBtnActive]}
              onPress={() => updatePackage(pkg.id, 'isFragile', !pkg.isFragile)}
            >
              <Text style={[styles.fragileText, pkg.isFragile && styles.fragileTextActive]}>
                {pkg.isFragile ? '✅' : '⬜'} Fragile Item
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📊 Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Packages</Text>
            <Text style={styles.summaryValue}>{packages.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Fee</Text>
            <Text style={styles.summaryValueRed}>₱{totalFee}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>Submit {packages.length} Package(s)</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      <MapPicker
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelectLocation={handleLocationSelect}
        initialAddress={
          mapPickerTarget === 'sender'
            ? senderAddress
            : packages.find(p => p.id === mapPickerTarget)?.receiverAddress || ''
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd',
  },
  backButton: { fontSize: 28, color: '#333' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  content: { flex: 1, padding: 15 },
  infoBanner: {
    backgroundColor: '#E3F2FD', borderRadius: 10, padding: 12, marginBottom: 15,
  },
  infoText: { fontSize: 13, color: '#1565C0', fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#ED1C24', marginTop: 10, marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, backgroundColor: '#fff', fontSize: 15, marginBottom: 10,
  },
  timeSlotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  slotBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 2, borderColor: '#ddd', backgroundColor: '#fff',
  },
  slotBtnActive: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  slotText: { fontSize: 13, fontWeight: '600', color: '#666' },
  slotTextActive: { color: '#4CAF50' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 10, padding: 12, backgroundColor: '#fff', marginBottom: 15,
  },
  dateBtnText: { fontSize: 15, color: '#333', fontWeight: '500' },
  packagesTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  addBtn: { backgroundColor: '#ED1C24', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  packageCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15,
    borderWidth: 1, borderColor: '#e0e0e0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  packageCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  packageCardTitle: { fontSize: 15, fontWeight: 'bold', color: '#ED1C24' },
  packageCardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  packageFee: { fontSize: 15, fontWeight: 'bold', color: '#4CAF50' },
  removeBtn: { fontSize: 18, color: '#999', fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  fragileBtn: {
    padding: 10, borderRadius: 8, borderWidth: 2, borderColor: '#ddd', backgroundColor: '#f9f9f9',
  },
  fragileBtnActive: { borderColor: '#FF9800', backgroundColor: '#FFF3E0' },
  fragileText: { fontSize: 14, fontWeight: '600', color: '#666' },
  fragileTextActive: { color: '#FF9800' },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  summaryTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  summaryValueRed: { fontSize: 16, fontWeight: 'bold', color: '#ED1C24' },
  submitBtn: {
    backgroundColor: '#ED1C24', padding: 16, borderRadius: 12,
    alignItems: 'center', marginBottom: 40,
  },
  submitBtnDisabled: { backgroundColor: '#ccc' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  addressRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  mapBtn: {
    backgroundColor: '#4CAF50', width: 50,
    justifyContent: 'center', alignItems: 'center', borderRadius: 10,
  },
  mapBtnText: { fontSize: 24 },
});
