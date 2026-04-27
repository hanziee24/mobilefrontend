import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deliveryAPI } from '../services/api';

interface Delivery {
  id: number;
  tracking_number: string;
  sender_name: string;
  sender_contact: string;
  receiver_name: string;
  receiver_contact: string;
  delivery_address: string;
  package_details?: string;
  package_weight?: string;
  special_instructions?: string;
  delivery_fee: string;
  payment_method?: string;
  is_fragile: boolean;
  status: string;
  created_at: string;
  pickup_address?: string;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#FF9800',
  PICKED_UP: '#1565C0',
  IN_TRANSIT: '#1565C0',
  OUT_FOR_DELIVERY: '#7B1FA2',
  DELIVERED: '#2E7D32',
  CANCELLED: '#C62828',
  FAILED: '#C62828',
};

export default function CashierParcelHistory() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [filter, setFilter] = useState<'today' | 'all'>('today');

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('userType').then(t => setIsAdmin(t === 'ADMIN'));
    fetchDeliveries();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDeliveries();
    }, [])
  );

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const userType = await AsyncStorage.getItem('userType');
      const res = await deliveryAPI.getAllDeliveries();
      const data = userType === 'ADMIN'
        ? res.data
        : res.data.filter((d: Delivery) => (d.pickup_address || '').startsWith('Branch Drop-off'));
      setDeliveries(data);
    } catch (e) {
      console.log('Failed to load parcel history:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = deliveries.filter(d => {
    if (filter === 'today') {
      return new Date(d.created_at).toDateString() === new Date().toDateString();
    }
    return true;
  });

  const totalFees = filtered.reduce((sum, d) => sum + (parseFloat(d.delivery_fee) || 0), 0);

  const paymentBreakdown = (['CASH', 'GCASH', 'MAYA', 'BANK_TRANSFER', 'CREDIT_CARD'] as const).map(method => ({
    method,
    label: method === 'BANK_TRANSFER' ? 'Bank' : method === 'CREDIT_CARD' ? 'Card' : method,
    total: filtered.filter(d => d.payment_method === method).reduce((sum, d) => sum + (parseFloat(d.delivery_fee) || 0), 0),
    count: filtered.filter(d => d.payment_method === method).length,
  })).filter(b => b.count > 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isAdmin ? 'Transaction History' : 'Parcel History'}</Text>
        <TouchableOpacity onPress={fetchDeliveries}>
          <Text style={styles.refreshBtn}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'today' && styles.filterBtnActive]}
          onPress={() => setFilter('today')}
        >
          <Text style={[styles.filterBtnText, filter === 'today' && styles.filterBtnTextActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>All Time</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{filtered.length}</Text>
          <Text style={styles.summaryLabel}>Parcels</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.summaryNum}>₱{totalFees.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Fees Collected</Text>
        </View>
      </View>

      {paymentBreakdown.length > 0 && (
        <View style={styles.breakdownRow}>
          {paymentBreakdown.map(b => (
            <View key={b.method} style={styles.breakdownCard}>
              <Text style={styles.breakdownMethod}>{b.label}</Text>
              <Text style={styles.breakdownAmount}>₱{b.total.toFixed(2)}</Text>
              <Text style={styles.breakdownCount}>{b.count} parcel{b.count > 1 ? 's' : ''}</Text>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No parcels {filter === 'today' ? 'accepted today' : 'found'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 15, paddingBottom: 40 }}>
          {filtered.map(d => (
            <TouchableOpacity key={d.id} style={styles.card} onPress={() => setSelected(d)}>
              <View style={styles.cardTop}>
                <Text style={styles.tracking}>{d.tracking_number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[d.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[d.status] }]}>{d.status.replace(/_/g, ' ')}</Text>
                </View>
              </View>
              <Text style={styles.cardDetail}>📤 {d.sender_name} → 📥 {d.receiver_name}</Text>
              <Text style={styles.cardDetail}>📍 {d.delivery_address}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.cardFee}>₱{parseFloat(d.delivery_fee).toFixed(2)}</Text>
                <Text style={styles.cardDate}>{new Date(d.created_at).toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Waybill Modal */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={styles.backBtn}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Waybill</Text>
            <View style={{ width: 60 }} />
          </View>
          {selected && (
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <View style={styles.waybillCard}>
                <Text style={styles.waybillBrand}>📦 Branch Drop-off</Text>
                <Text style={styles.waybillTracking}>{selected.tracking_number}</Text>
                <Text style={styles.waybillDate}>{new Date(selected.created_at).toLocaleString()}</Text>

                <View style={styles.divider} />

                <Text style={styles.section}>SENDER</Text>
                <Text style={styles.waybillName}>{selected.sender_name}</Text>
                <Text style={styles.waybillDetail}>📞 {selected.sender_contact}</Text>

                <View style={styles.divider} />

                <Text style={styles.section}>RECEIVER</Text>
                <Text style={styles.waybillName}>{selected.receiver_name}</Text>
                <Text style={styles.waybillDetail}>📞 {selected.receiver_contact}</Text>
                <Text style={styles.waybillDetail}>📍 {selected.delivery_address}</Text>

                <View style={styles.divider} />

                <Text style={styles.section}>PARCEL</Text>
                <Text style={styles.waybillDetail}>{selected.package_details || `Weight: ${selected.package_weight || 'N/A'}kg`}</Text>
                {selected.special_instructions ? (
                  <Text style={styles.waybillDetail}>📝 {selected.special_instructions}</Text>
                ) : null}
                {selected.is_fragile && (
                  <View style={styles.fragileBadge}>
                    <Text style={styles.fragileBadgeText}>⚠️ FRAGILE — Handle with Care</Text>
                  </View>
                )}

                <View style={styles.divider} />

                <Text style={styles.section}>PAYMENT</Text>
                <View style={styles.row}>
                  <Text style={styles.waybillLabel}>Delivery Fee</Text>
                  <Text style={styles.waybillFee}>₱{parseFloat(selected.delivery_fee).toFixed(2)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.waybillLabel}>Method</Text>
                  <Text style={styles.waybillVal}>{selected.payment_method || 'N/A'}</Text>
                </View>

                <View style={styles.divider} />

                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[selected.status] + '20', alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8 }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[selected.status], fontSize: 14 }]}>
                    {selected.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#ED1C24' },
  backBtn: { fontSize: 26, color: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  refreshBtn: { fontSize: 13, color: '#fff', fontWeight: '600' },
  filterRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 2, borderColor: '#ddd', alignItems: 'center' },
  filterBtnActive: { borderColor: '#ED1C24', backgroundColor: '#FFF0F0' },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
  filterBtnTextActive: { color: '#ED1C24' },
  summaryRow: { flexDirection: 'row', gap: 12, padding: 15, paddingBottom: 5 },
  summaryCard: { flex: 1, backgroundColor: '#ED1C24', borderRadius: 12, padding: 16, alignItems: 'center' },
  summaryNum: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: '#fff', opacity: 0.9 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#999' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tracking: { fontSize: 14, fontWeight: 'bold', color: '#ED1C24' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDetail: { fontSize: 12, color: '#666', marginBottom: 3 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  cardFee: { fontSize: 15, fontWeight: 'bold', color: '#4CAF50' },
  cardDate: { fontSize: 11, color: '#bbb' },
  breakdownRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 15, paddingBottom: 8 },
  breakdownCard: { backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 70, flex: 1, borderWidth: 1, borderColor: '#e0e0e0', elevation: 1 },
  breakdownMethod: { fontSize: 11, fontWeight: '700', color: '#555', marginBottom: 2 },
  breakdownAmount: { fontSize: 13, fontWeight: 'bold', color: '#1565C0' },
  breakdownCount: { fontSize: 10, color: '#aaa', marginTop: 1 },
  waybillCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 2, borderColor: '#ED1C24' },
  waybillBrand: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 6 },
  waybillTracking: { fontSize: 26, fontWeight: 'bold', color: '#ED1C24', textAlign: 'center', letterSpacing: 1, marginBottom: 4 },
  waybillDate: { fontSize: 12, color: '#999', textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  section: { fontSize: 11, fontWeight: '700', color: '#ED1C24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  waybillName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  waybillDetail: { fontSize: 13, color: '#666', marginBottom: 2 },
  fragileBadge: { backgroundColor: '#FFF3E0', borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#FF9800' },
  fragileBadgeText: { fontSize: 13, fontWeight: '700', color: '#FF9800', textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  waybillLabel: { fontSize: 13, color: '#888' },
  waybillFee: { fontSize: 18, fontWeight: 'bold', color: '#ED1C24' },
  waybillVal: { fontSize: 13, fontWeight: '600', color: '#333' },
});
