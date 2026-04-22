import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import { addressAPI } from '../services/api';

type Address = { id: number; label: string; address: string; is_default: boolean };

export default function SavedAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState({ label: '', address: '', is_default: false });

  useEffect(() => { fetchAddresses(); }, []);

  const fetchAddresses = async () => {
    try {
      const res = await addressAPI.getAddresses();
      setAddresses(res.data);
    } catch {
      Alert.alert('Error', 'Failed to load addresses.');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ label: '', address: '', is_default: false });
    setModalVisible(true);
  };

  const openEdit = (item: Address) => {
    setEditing(item);
    setForm({ label: item.label, address: item.address, is_default: item.is_default });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.label.trim() || !form.address.trim()) {
      Alert.alert('Error', 'Label and address are required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await addressAPI.updateAddress(editing.id, form);
        setAddresses(prev => prev.map(a => a.id === editing.id ? res.data : a));
      } else {
        const res = await addressAPI.addAddress(form);
        setAddresses(prev => [...prev, res.data]);
      }
      // If set as default, update local state
      if (form.is_default) {
        setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === (editing?.id ?? prev[prev.length - 1]?.id) })));
      }
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to save address.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: Address) => {
    Alert.alert('Delete Address', `Remove "${item.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await addressAPI.deleteAddress(item.id);
            setAddresses(prev => prev.filter(a => a.id !== item.id));
          } catch {
            Alert.alert('Error', 'Failed to delete address.');
          }
        }
      }
    ]);
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
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Saved Addresses</Text>
        <TouchableOpacity onPress={openAdd}>
          <Text style={styles.addBtn}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {addresses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyText}>No saved addresses yet.</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
              <Text style={styles.emptyAddBtnText}>Add Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          addresses.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{item.label}</Text>
                  {item.is_default && <View style={styles.defaultBadge}><Text style={styles.defaultText}>Default</Text></View>}
                </View>
                <Text style={styles.addressText}>{item.address}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
                  <Text style={styles.editBtnText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Address' : 'Add Address'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Label (e.g. Home, Work)</Text>
            <TextInput
              style={styles.input}
              value={form.label}
              onChangeText={v => setForm(f => ({ ...f, label: v }))}
              placeholder="Label"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={form.address}
              onChangeText={v => setForm(f => ({ ...f, address: v }))}
              placeholder="Full address"
              placeholderTextColor="#bbb"
              multiline
            />

            <TouchableOpacity style={styles.defaultToggle} onPress={() => setForm(f => ({ ...f, is_default: !f.is_default }))}>
              <View style={[styles.checkbox, form.is_default && styles.checkboxChecked]}>
                {form.is_default && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.defaultToggleText}>Set as default address</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { backgroundColor: '#ccc' }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Address'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addBtn: { fontSize: 16, color: '#ED1C24', fontWeight: '600' },
  content: { flex: 1, padding: 15 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#999', marginBottom: 20 },
  emptyAddBtn: { backgroundColor: '#ED1C24', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  emptyAddBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  cardLeft: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 16, fontWeight: '700', color: '#333', marginRight: 8 },
  defaultBadge: { backgroundColor: '#FFF0F0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  defaultText: { fontSize: 11, color: '#ED1C24', fontWeight: '600' },
  addressText: { fontSize: 13, color: '#666' },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: { padding: 6 },
  editBtnText: { fontSize: 18 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalClose: { fontSize: 22, color: '#999' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 13, fontSize: 15, backgroundColor: '#fafafa', color: '#333' },
  defaultToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#ddd', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#ED1C24', borderColor: '#ED1C24' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  defaultToggleText: { fontSize: 14, color: '#555' },
  saveBtn: { backgroundColor: '#ED1C24', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
