import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { settingsAPI } from '../services/api';

export default function AdminSystemSettings() {
  const [baseFee, setBaseFee] = useState('');
  const [perKgRate, setPerKgRate] = useState('');
  const [perItemRate, setPerItemRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await settingsAPI.getFeeConfig();
      setBaseFee(parseFloat(res.data.base_fee).toString());
      setPerKgRate(parseFloat(res.data.per_kg_rate).toString());
      setPerItemRate(parseFloat(res.data.per_item_rate).toString());
    } catch (error) {
      Alert.alert('Error', 'Failed to load fee configuration');
    } finally {
      setLoading(false);
    }
  };

  const previewFee = () => {
    const base = parseFloat(baseFee) || 0;
    const kg = parseFloat(perKgRate) || 0;
    const item = parseFloat(perItemRate) || 0;
    return Math.ceil(base + 1 * kg + 1 * item);
  };

  const handleSave = () => {
    const base = parseFloat(baseFee);
    const kg = parseFloat(perKgRate);
    const item = parseFloat(perItemRate);

    if (isNaN(base) || base < 0) { Alert.alert('Error', 'Base fee must be a valid positive number'); return; }
    if (isNaN(kg) || kg < 0) { Alert.alert('Error', 'Per kg rate must be a valid positive number'); return; }
    if (isNaN(item) || item < 0) { Alert.alert('Error', 'Per item rate must be a valid positive number'); return; }

    Alert.alert(
      'Confirm Changes',
      `New fee formula:\nBase: ₱${base}\nPer kg: ₱${kg}\nPer item: ₱${item}\n\nExample (1kg, 1 item): ₱${Math.ceil(base + kg + item)}\n\nThis will apply to all new deliveries.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: saveConfig },
      ]
    );
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateFeeConfig({
        base_fee: parseFloat(baseFee),
        per_kg_rate: parseFloat(perKgRate),
        per_item_rate: parseFloat(perItemRate),
      });
      Alert.alert('✅ Saved', 'Delivery fee configuration updated successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ED1C24" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>System Settings</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>

        <Text style={styles.sectionTitle}>⚙️ Delivery Fee Configuration</Text>
        <Text style={styles.sectionSub}>
          These rates apply to all new deliveries created by customers and cashiers.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Base Fee (₱)</Text>
          <Text style={styles.hint}>Fixed charge applied to every delivery</Text>
          <TextInput
            style={styles.input}
            value={baseFee}
            onChangeText={setBaseFee}
            keyboardType="numeric"
            placeholder="e.g. 50"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Per Kilogram Rate (₱/kg)</Text>
          <Text style={styles.hint}>Added per kg of parcel weight</Text>
          <TextInput
            style={styles.input}
            value={perKgRate}
            onChangeText={setPerKgRate}
            keyboardType="numeric"
            placeholder="e.g. 15"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Per Item Rate (₱/item)</Text>
          <Text style={styles.hint}>Added per quantity of items</Text>
          <TextInput
            style={styles.input}
            value={perItemRate}
            onChangeText={setPerItemRate}
            keyboardType="numeric"
            placeholder="e.g. 10"
            placeholderTextColor="#999"
          />
        </View>

        {/* Formula preview */}
        <View style={styles.formulaCard}>
          <Text style={styles.formulaTitle}>📐 Fee Formula</Text>
          <Text style={styles.formulaText}>
            Total = ₱{baseFee || '0'} + (weight × ₱{perKgRate || '0'}) + (qty × ₱{perItemRate || '0'})
          </Text>
          <View style={styles.divider} />
          <Text style={styles.exampleTitle}>Example (1kg, 1 item):</Text>
          <Text style={styles.exampleFee}>₱{previewFee().toFixed(2)}</Text>
        </View>

        {/* Example table */}
        <View style={styles.card}>
          <Text style={styles.tableTitle}>📋 Sample Fee Table</Text>
          {[
            { label: '0.5kg, 1 item', weight: 0.5, qty: 1 },
            { label: '1kg, 1 item', weight: 1, qty: 1 },
            { label: '2kg, 2 items', weight: 2, qty: 2 },
            { label: '5kg, 3 items', weight: 5, qty: 3 },
          ].map((row, i) => {
            const fee = Math.ceil(
              (parseFloat(baseFee) || 0) +
              row.weight * (parseFloat(perKgRate) || 0) +
              row.qty * (parseFloat(perItemRate) || 0)
            );
            return (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableLabel}>{row.label}</Text>
                <Text style={styles.tableFee}>₱{fee.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>💾 Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15,
    backgroundColor: '#1a1a1a', borderBottomWidth: 3, borderBottomColor: '#ED1C24',
  },
  backBtn: { fontSize: 26, color: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 6, marginTop: 4 },
  sectionSub: { fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 18 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 12, marginBottom: 2 },
  hint: { fontSize: 11, color: '#999', marginBottom: 6, fontStyle: 'italic' },
  input: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10,
    padding: 13, fontSize: 16, backgroundColor: '#fafafa', color: '#333',
  },
  formulaCard: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 18, marginBottom: 14,
    alignItems: 'center',
  },
  formulaTitle: { fontSize: 14, fontWeight: '700', color: '#ED1C24', marginBottom: 8 },
  formulaText: { fontSize: 13, color: '#fff', textAlign: 'center', lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#333', width: '100%', marginVertical: 12 },
  exampleTitle: { fontSize: 12, color: '#aaa', marginBottom: 4 },
  exampleFee: { fontSize: 32, fontWeight: 'bold', color: '#4CAF50' },
  tableTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 12 },
  tableRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  tableLabel: { fontSize: 13, color: '#555' },
  tableFee: { fontSize: 14, fontWeight: 'bold', color: '#ED1C24' },
  saveBtn: {
    backgroundColor: '#ED1C24', padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 4,
  },
  saveBtnDisabled: { backgroundColor: '#ccc' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
