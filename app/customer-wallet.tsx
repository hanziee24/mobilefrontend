import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { router } from 'expo-router';
import { paymentAPI } from '../services/api';

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#4CAF50',
  PENDING: '#FF9800',
  FAILED: '#ED1C24',
  REFUNDED: '#2196F3',
  PROCESSING: '#9C27B0',
};

const METHOD_ICON: Record<string, string> = {
  COD: '💵',
  GCASH: '📱',
};

export default function CustomerWallet() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    try {
      const res = await paymentAPI.getPayments();
      setPayments(res.data);
    } catch { }
    finally { setLoading(false); }
  };

  const totalSpent = payments
    .filter(p => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const completed = payments.filter(p => p.status === 'COMPLETED').length;
  const pending = payments.filter(p => p.status === 'PENDING').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Wallet</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 15, paddingBottom: 40 }}>

          {/* Summary card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={styles.summaryAmount}>₱{totalSpent.toFixed(2)}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemNum}>{payments.length}</Text>
                <Text style={styles.summaryItemLabel}>Total</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemNum}>{completed}</Text>
                <Text style={styles.summaryItemLabel}>Completed</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemNum}>{pending}</Text>
                <Text style={styles.summaryItemLabel}>Pending</Text>
              </View>
            </View>
          </View>

          {/* Transaction list */}
          <Text style={styles.sectionTitle}>Transaction History</Text>

          {payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Your payment history will appear here</Text>
            </View>
          ) : (
            payments.map(p => (
              <TouchableOpacity key={p.id} style={styles.txCard} onPress={() => setSelected(p)}>
                <View style={styles.txLeft}>
                  <Text style={styles.txIcon}>{METHOD_ICON[p.payment_method] || '💳'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTracking}>{p.delivery_tracking}</Text>
                    <Text style={styles.txMethod}>{p.payment_method}</Text>
                    <Text style={styles.txDate}>{new Date(p.created_at).toLocaleString()}</Text>
                  </View>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>₱{parseFloat(p.amount).toFixed(2)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[p.status] + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[p.status] }]}>{p.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Receipt Modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.receiptTitle}>🧾 Receipt</Text>
            <Text style={styles.receiptNum}>{selected?.receipt_number}</Text>

            <View style={styles.receiptDivider} />

            {[
              { label: 'Tracking No.', value: selected?.delivery_tracking },
              { label: 'Payment Method', value: `${METHOD_ICON[selected?.payment_method] || ''} ${selected?.payment_method}` },
              { label: 'Amount', value: `₱${parseFloat(selected?.amount || 0).toFixed(2)}` },
              { label: 'Transaction Fee', value: `₱${parseFloat(selected?.transaction_fee || 0).toFixed(2)}` },
              { label: 'Status', value: selected?.status },
              { label: 'Date', value: selected ? new Date(selected.created_at).toLocaleString() : '' },
              selected?.paid_at ? { label: 'Paid At', value: new Date(selected.paid_at).toLocaleString() } : null,
            ].filter(Boolean).map((row: any, i) => (
              <View key={i} style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>{row.label}</Text>
                <Text style={[
                  styles.receiptValue,
                  row.label === 'Amount' && { color: '#ED1C24', fontWeight: 'bold', fontSize: 16 },
                  row.label === 'Status' && { color: STATUS_COLOR[selected?.status] || '#333', fontWeight: '600' },
                ]}>{row.value}</Text>
              </View>
            ))}

            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#ED1C24' },
  backBtn: { fontSize: 28, color: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

  summaryCard: { backgroundColor: '#ED1C24', borderRadius: 20, padding: 24, marginBottom: 20, alignItems: 'center', elevation: 4, shadowColor: '#ED1C24', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  summaryLabel: { fontSize: 13, color: '#fff', opacity: 0.85, marginBottom: 6 },
  summaryAmount: { fontSize: 38, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20, gap: 20 },
  summaryItem: { alignItems: 'center' },
  summaryItemNum: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  summaryItemLabel: { fontSize: 11, color: '#fff', opacity: 0.85, marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  txLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIcon: { fontSize: 30 },
  txTracking: { fontSize: 14, fontWeight: '600', color: '#333' },
  txMethod: { fontSize: 12, color: '#888', marginTop: 2 },
  txDate: { fontSize: 11, color: '#bbb', marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 6 },
  txAmount: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#666' },
  emptySubtext: { fontSize: 13, color: '#aaa', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  receiptTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 4 },
  receiptNum: { fontSize: 13, color: '#ED1C24', fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  receiptDivider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 16 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  receiptLabel: { fontSize: 13, color: '#888' },
  receiptValue: { fontSize: 13, fontWeight: '600', color: '#333', maxWidth: '60%', textAlign: 'right' },
  closeBtn: { backgroundColor: '#ED1C24', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
