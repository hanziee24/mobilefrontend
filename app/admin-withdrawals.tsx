import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { paymentAPI } from '../services/api';

interface WithdrawalRequest {
  id: number;
  rider_name: string;
  amount: string;
  withdrawal_method: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  processed_at?: string;
  processed_by_name?: string;
  admin_notes?: string;
}

export default function AdminWithdrawals() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [actionId, setActionId] = useState<number | null>(null);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await paymentAPI.getWithdrawals();
      setRequests(res.data);
    } catch {
      Alert.alert('Error', 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (req: WithdrawalRequest) => {
    Alert.alert('Approve Withdrawal', `Approve ₱${parseFloat(req.amount).toFixed(2)} for ${req.rider_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', style: 'default', onPress: async () => {
        setActionId(req.id);
        try {
          await paymentAPI.approveWithdrawal(req.id);
          loadRequests();
        } catch (e: any) {
          Alert.alert('Error', e.response?.data?.error || 'Failed to approve');
        } finally {
          setActionId(null);
        }
      }},
    ]);
  };

  const handleReject = (req: WithdrawalRequest) => {
    Alert.alert('Reject Withdrawal', `Reject ₱${parseFloat(req.amount).toFixed(2)} for ${req.rider_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        setActionId(req.id);
        try {
          await paymentAPI.rejectWithdrawal(req.id);
          loadRequests();
        } catch (e: any) {
          Alert.alert('Error', e.response?.data?.error || 'Failed to reject');
        } finally {
          setActionId(null);
        }
      }},
    ]);
  };

  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Withdrawal Requests</Text>
        <TouchableOpacity onPress={loadRequests}><Text style={styles.refreshBtn}>Refresh</Text></TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(k => (
          <TouchableOpacity key={k} style={[styles.filterBtn, filter === k && styles.filterActive]} onPress={() => setFilter(k)}>
            <Text style={[styles.filterText, filter === k && styles.filterTextActive]}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 15, paddingBottom: 40 }}>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>No withdrawal requests</Text>
          ) : filtered.map(req => (
            <View key={req.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.name}>{req.rider_name}</Text>
                <Text style={styles.amount}>₱{parseFloat(req.amount).toFixed(2)}</Text>
              </View>
              <Text style={styles.sub}>Method: {req.withdrawal_method}</Text>
              <Text style={styles.sub}>Requested: {new Date(req.created_at).toLocaleString()}</Text>
              <View style={styles.row}>
                <Text style={[styles.status, req.status === 'PENDING' && styles.statusPending, req.status === 'APPROVED' && styles.statusApproved, req.status === 'REJECTED' && styles.statusRejected]}>
                  {req.status}
                </Text>
                {req.status === 'PENDING' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.approveBtn, actionId === req.id && { opacity: 0.5 }]} onPress={() => handleApprove(req)} disabled={actionId === req.id}>
                      <Text style={styles.actionText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn, actionId === req.id && { opacity: 0.5 }]} onPress={() => handleReject(req)} disabled={actionId === req.id}>
                      <Text style={styles.actionText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {req.processed_at && (
                <Text style={styles.sub}>Processed: {new Date(req.processed_at).toLocaleString()} {req.processed_by_name ? `• ${req.processed_by_name}` : ''}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#ED1C24' },
  backBtn: { fontSize: 26, color: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  refreshBtn: { fontSize: 12, color: '#fff', fontWeight: '600' },
  filters: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  filterActive: { backgroundColor: '#FFF0F0', borderColor: '#ED1C24' },
  filterText: { fontSize: 12, color: '#666', fontWeight: '600' },
  filterTextActive: { color: '#ED1C24' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  name: { fontSize: 14, fontWeight: '600', color: '#333' },
  amount: { fontSize: 14, fontWeight: '700', color: '#ED1C24' },
  sub: { fontSize: 12, color: '#777', marginBottom: 2 },
  status: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  statusPending: { backgroundColor: '#FFF3E0', color: '#EF6C00' },
  statusApproved: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  statusRejected: { backgroundColor: '#FDECEA', color: '#C62828' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  approveBtn: { backgroundColor: '#2E7D32' },
  rejectBtn: { backgroundColor: '#C62828' },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 30, fontSize: 14 },
});
