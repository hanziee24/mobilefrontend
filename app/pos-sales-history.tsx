import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { router } from 'expo-router';
import { posAPI } from '../services/api';

interface SaleItem {
  product_name: string;
  quantity: number;
  subtotal: string;
}

interface Sale {
  id: number;
  receipt_number: string;
  items: SaleItem[];
  subtotal: string;
  discount: string;
  total: string;
  amount_tendered: string;
  change: string;
  payment_method: string;
  cashier_name: string;
  created_at: string;
  status: 'COMPLETED' | 'VOIDED' | 'REFUNDED';
}

export default function CashierSalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Sale | null>(null);

  useEffect(() => { loadSales(); }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const res = await posAPI.getSales();
      setSales(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Sales History</Text>
        <TouchableOpacity onPress={loadSales}><Text style={styles.refreshBtn}>Refresh</Text></TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 15, paddingBottom: 40 }}>
          {sales.length === 0 ? (
            <Text style={styles.emptyText}>No sales yet</Text>
          ) : sales.map((sale) => (
            <TouchableOpacity key={sale.id} style={styles.saleCard} onPress={() => setSelected(sale)}>
              <View style={styles.saleRow}>
                <Text style={styles.saleReceipt}>{sale.receipt_number}</Text>
                <Text style={styles.saleTotal}>₱{parseFloat(sale.total).toFixed(2)}</Text>
              </View>
              <View style={styles.saleRow}>
                <Text style={styles.saleSub}>{new Date(sale.created_at).toLocaleString()}</Text>
                <Text style={[styles.statusBadge, sale.status === 'COMPLETED' && styles.statusCompleted, sale.status === 'VOIDED' && styles.statusVoided, sale.status === 'REFUNDED' && styles.statusRefunded]}>
                  {sale.status}
                </Text>
              </View>
              <Text style={styles.saleSub}>Payment: {sale.payment_method}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelected(null)}><Text style={styles.backBtn}>×</Text></TouchableOpacity>
            <Text style={styles.title}>Receipt</Text>
            <View style={{ width: 60 }} />
          </View>
          {selected && (
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <View style={styles.receiptCard}>
                <Text style={styles.receiptTitle}>Sales Receipt</Text>
                <Text style={styles.receiptNum}>{selected.receipt_number}</Text>
                <Text style={styles.receiptSub}>Cashier: {selected.cashier_name}</Text>
                <Text style={styles.receiptSub}>{new Date(selected.created_at).toLocaleString()}</Text>
                <View style={styles.divider} />
                {selected.items.map((item, i) => (
                  <View key={i} style={styles.receiptRow}>
                    <Text style={styles.receiptItem}>{item.product_name} x{item.quantity}</Text>
                    <Text style={styles.receiptItemAmt}>₱{parseFloat(item.subtotal).toFixed(2)}</Text>
                  </View>
                ))}
                <View style={styles.divider} />
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Subtotal</Text><Text style={styles.receiptVal}>₱{parseFloat(selected.subtotal).toFixed(2)}</Text></View>
                {parseFloat(selected.discount) > 0 && (
                  <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Discount</Text><Text style={[styles.receiptVal, { color: '#4CAF50' }]}>-₱{parseFloat(selected.discount).toFixed(2)}</Text></View>
                )}
                <View style={styles.receiptRow}><Text style={[styles.receiptLabel, { fontWeight: 'bold' }]}>Total</Text><Text style={styles.receiptTotal}>₱{parseFloat(selected.total).toFixed(2)}</Text></View>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Payment</Text><Text style={styles.receiptVal}>{selected.payment_method}</Text></View>
                {selected.payment_method === 'CASH' && (
                  <>
                    <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Tendered</Text><Text style={styles.receiptVal}>₱{parseFloat(selected.amount_tendered).toFixed(2)}</Text></View>
                    <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Change</Text><Text style={[styles.receiptVal, { color: '#ED1C24', fontWeight: 'bold' }]}>₱{parseFloat(selected.change).toFixed(2)}</Text></View>
                  </>
                )}
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Status</Text><Text style={styles.receiptVal}>{selected.status}</Text></View>
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
  refreshBtn: { fontSize: 12, color: '#fff', fontWeight: '600' },
  saleCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  saleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' },
  saleReceipt: { fontSize: 13, fontWeight: '600', color: '#333' },
  saleTotal: { fontSize: 14, fontWeight: 'bold', color: '#ED1C24' },
  saleSub: { fontSize: 12, color: '#999' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20, fontSize: 14 },
  statusBadge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  statusCompleted: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  statusVoided: { backgroundColor: '#FDECEA', color: '#C62828' },
  statusRefunded: { backgroundColor: '#E3F2FD', color: '#1565C0' },
  receiptCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20 },
  receiptTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 4 },
  receiptNum: { fontSize: 13, color: '#ED1C24', textAlign: 'center', fontWeight: '600', marginBottom: 4 },
  receiptSub: { fontSize: 12, color: '#999', textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  receiptItem: { fontSize: 13, color: '#333', flex: 1 },
  receiptItemAmt: { fontSize: 13, color: '#333', fontWeight: '600' },
  receiptLabel: { fontSize: 14, color: '#666' },
  receiptVal: { fontSize: 14, color: '#333', fontWeight: '600' },
  receiptTotal: { fontSize: 18, fontWeight: 'bold', color: '#ED1C24' },
});
