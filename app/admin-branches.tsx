import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { authAPI } from '../services/api';
import MapPicker from '../components/MapPicker';
import { isAxiosError } from 'axios';
import MapView, { Marker, Callout } from 'react-native-maps';

type Branch = { id: number; name: string; address: string; latitude?: number; longitude?: number; is_active: boolean };

const to6dp = (value: number) => Number(value.toFixed(6));

const getAxiosErrorMessage = (error: any) => {
  if (!isAxiosError(error)) return null;
  const data = error.response?.data;
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data.error === 'string') return data.error;
  if (typeof data.detail === 'string') return data.detail;

  const preferredFields = ['name', 'address', 'latitude', 'longitude', 'non_field_errors'];
  for (const field of preferredFields) {
    const value = data[field];
    if (Array.isArray(value) && value.length > 0) return `${field}: ${String(value[0])}`;
    if (typeof value === 'string') return `${field}: ${value}`;
  }

  const firstKey = Object.keys(data)[0];
  if (!firstKey) return null;
  const firstValue = data[firstKey];
  if (Array.isArray(firstValue) && firstValue.length > 0) return `${firstKey}: ${String(firstValue[0])}`;
  if (typeof firstValue === 'string') return `${firstKey}: ${firstValue}`;
  return null;
};

export default function AdminBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapView, setMapView] = useState<'list' | 'map'>('list');

  useEffect(() => { fetchBranches(); }, []);

  const fetchBranches = async () => {
    try {
      const res = await authAPI.getBranches();
      setBranches(res.data);
    } catch (error) {
      if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        Alert.alert('Session Required', 'Only admin accounts can manage hubs. Please sign in as admin and try again.');
      } else {
        Alert.alert('Error', 'Failed to load branches');
      }
    }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setName(''); setAddress(''); setLatitude(undefined); setLongitude(undefined);
    setShowForm(true);
  };

  const openEdit = (b: Branch) => {
    setEditing(b);
    setName(b.name); setAddress(b.address);
    setLatitude(b.latitude ? Number(b.latitude) : undefined);
    setLongitude(b.longitude ? Number(b.longitude) : undefined);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Branch name is required'); return; }
    if (!address.trim()) { Alert.alert('Required', 'Address is required'); return; }
    setSaving(true);
    try {
      const payload: { name: string; address: string; latitude?: number; longitude?: number } = {
        name: name.trim(),
        address: address.trim(),
      };

      const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
      if (hasValidCoordinates && latitude !== undefined && longitude !== undefined) {
        payload.latitude = to6dp(latitude);
        payload.longitude = to6dp(longitude);
      }

      if (editing) {
        await authAPI.updateBranch(editing.id, payload);
      } else {
        await authAPI.createBranch(payload);
      }
      setShowForm(false);
      fetchBranches();
    } catch (error) {
      if (isAxiosError(error)) {
        const serverMessage = getAxiosErrorMessage(error);

        if (error.response?.status === 401 || error.response?.status === 403) {
          Alert.alert('Permission Denied', serverMessage || 'Only admin accounts can create or edit hubs.');
        } else if (error.response?.status === 400) {
          Alert.alert('Validation Error', serverMessage || 'Please check hub name, address, and map pin values.');
        } else {
          Alert.alert('Error', serverMessage || 'Failed to save branch');
        }
      } else {
        Alert.alert('Error', 'Failed to save branch');
      }
    }
    finally { setSaving(false); }
  };

  const handleDelete = (b: Branch) => {
    Alert.alert('Deactivate Branch', `Deactivate "${b.name}"? Riders assigned to it will become unassigned.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: async () => {
        try {
          await authAPI.deleteBranch(b.id);
          fetchBranches();
        } catch { Alert.alert('Error', 'Failed to deactivate branch'); }
      }},
    ]);
  };

  const pinnedBranches = branches.filter(b => b.latitude && b.longitude);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manage Hubs</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity style={[styles.toggleBtn, mapView === 'list' && styles.toggleActive]} onPress={() => setMapView('list')}>
          <Text style={[styles.toggleText, mapView === 'list' && styles.toggleTextActive]}>📋 List</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, mapView === 'map' && styles.toggleActive]} onPress={() => setMapView('map')}>
          <Text style={[styles.toggleText, mapView === 'map' && styles.toggleTextActive]}>🗺️ Map</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 50 }} />
      ) : mapView === 'map' ? (
        <HubMapView branches={pinnedBranches} onEditBranch={openEdit} />
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
          {branches.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏢</Text>
              <Text style={styles.emptyText}>No hubs yet. Tap &quot;+ Add&quot; to create one.</Text>
            </View>
          ) : branches.map(b => (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.hubIcon}><Text style={styles.hubIconText}>🏢</Text></View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{b.name}</Text>
                  <Text style={styles.cardAddress}>{b.address}</Text>
                  {b.latitude && b.longitude ? (
                    <Text style={styles.cardCoords}>📍 {Number(b.latitude).toFixed(5)}, {Number(b.longitude).toFixed(5)}</Text>
                  ) : (
                    <Text style={styles.cardNoPin}>⚠️ No map pin set</Text>
                  )}
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(b)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(b)}>
                  <Text style={styles.deleteBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Create / Edit Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={styles.formOverlay}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{editing ? 'Edit Hub' : 'New Hub'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.formClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Hub Name *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. JRNZ Cebu Main Hub" placeholderTextColor="#aaa" />

              <Text style={styles.fieldLabel}>Address *</Text>
              <TextInput style={[styles.input, { minHeight: 70 }]} value={address} onChangeText={setAddress} placeholder="Full address" placeholderTextColor="#aaa" multiline textAlignVertical="top" />

              <Text style={styles.fieldLabel}>Map Location</Text>
              <TouchableOpacity style={styles.mapPickerBtn} onPress={() => setShowMapPicker(true)}>
                {latitude && longitude ? (
                  <View>
                    <Text style={styles.mapPickerBtnText}>📍 Location pinned</Text>
                    <Text style={styles.mapPickerCoords}>{latitude.toFixed(5)}, {longitude.toFixed(5)}</Text>
                  </View>
                ) : (
                  <Text style={styles.mapPickerBtnText}>🗺️ Tap to pin on map</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Create Hub'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <MapPicker
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelectLocation={(addr, lat, lng) => {
          if (!address.trim()) setAddress(addr);
          setLatitude(lat);
          setLongitude(lng);
          setShowMapPicker(false);
        }}
        initialAddress={address}
      />
    </View>
  );
}

function HubMapView({ branches, onEditBranch }: { branches: Branch[]; onEditBranch: (b: Branch) => void }) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallback}>
        <Text style={styles.webFallbackText}>🗺️ Map view is only available on mobile.</Text>
      </View>
    );
  }

  const initialRegion = branches.length > 0 && branches[0].latitude && branches[0].longitude
    ? { latitude: Number(branches[0].latitude), longitude: Number(branches[0].longitude), latitudeDelta: 0.15, longitudeDelta: 0.15 }
    : { latitude: 10.3157, longitude: 123.8854, latitudeDelta: 0.15, longitudeDelta: 0.15 };

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} initialRegion={initialRegion}>
        {branches.map(b => (
          <Marker
            key={b.id}
            coordinate={{ latitude: Number(b.latitude), longitude: Number(b.longitude) }}
            pinColor="#ED1C24"
          >
            <Callout onPress={() => onEditBranch(b)}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>🏢 {b.name}</Text>
                <Text style={styles.calloutAddress}>{b.address}</Text>
                <Text style={styles.calloutEdit}>Tap to edit →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      {branches.length === 0 && (
        <View style={styles.mapEmptyOverlay}>
          <Text style={styles.mapEmptyText}>No hubs with map pins yet.</Text>
          <Text style={styles.mapEmptyText}>Switch to List view and edit a hub to add a pin.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#ED1C24' },
  backBtn: { fontSize: 28, color: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  toggleRow: { flexDirection: 'row', margin: 12, backgroundColor: '#e0e0e0', borderRadius: 12, padding: 3 },
  toggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  toggleActive: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#888' },
  toggleTextActive: { color: '#ED1C24' },
  content: { flex: 1, paddingHorizontal: 12 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  cardLeft: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  hubIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  hubIconText: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 3 },
  cardAddress: { fontSize: 12, color: '#666', marginBottom: 3 },
  cardCoords: { fontSize: 11, color: '#4CAF50', fontWeight: '600' },
  cardNoPin: { fontSize: 11, color: '#FF9800', fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  editBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f0f0f0' },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#333' },
  deleteBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FFEBEE' },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#ED1C24' },
  formOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  formCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  formTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
  formClose: { fontSize: 20, color: '#999' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, padding: 13, fontSize: 14, color: '#333', backgroundColor: '#fafafa' },
  mapPickerBtn: { borderWidth: 1.5, borderColor: '#ED1C24', borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: '#FFF5F5' },
  mapPickerBtnText: { fontSize: 14, fontWeight: '700', color: '#ED1C24' },
  mapPickerCoords: { fontSize: 11, color: '#4CAF50', marginTop: 4, textAlign: 'center' },
  saveBtn: { backgroundColor: '#ED1C24', padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  callout: { padding: 10, minWidth: 180 },
  calloutName: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4 },
  calloutAddress: { fontSize: 12, color: '#666', marginBottom: 6 },
  calloutEdit: { fontSize: 12, color: '#ED1C24', fontWeight: '600' },
  webFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  webFallbackText: { fontSize: 15, color: '#888', textAlign: 'center' },
  mapEmptyOverlay: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 16, alignItems: 'center' },
  mapEmptyText: { color: '#fff', fontSize: 13, textAlign: 'center', marginBottom: 2 },
});
