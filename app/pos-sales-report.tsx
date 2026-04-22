import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { posAPI } from '../services/api';

const PERIODS = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This Week' },
  { key: 'monthly', label: 'This Month' },
] as const;

export default function SalesReport() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionSaleId, setActionSaleId] = useState<number | null>(null);

  useEffect(() => { loadReport(); }, [period]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await posAPI.getReport(period);
      setReport(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  const handleVoid = (sale: any) => {
    Alert.alert('Void Sale', `Void ${sale.receipt_number}? This will restock items.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Void', style: 'destructive', onPress: async () => {
        setActionSaleId(sale.id);
        try { await posAPI.voidSale(sale.id); loadReport(); }
        catch { Alert.alert('Error', 'Failed to void sale'); }
        finally { setActionSaleId(null); }
      }},
    ]);
  };

  const handleRefund = (sale: any) => {
    Alert.alert('Refund Sale', `Refund ${sale.receipt_number}? This will restock items.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Refund', style: 'destructive', onPress: async () => {
        setActionSaleId(sale.id);
        try { await posAPI.refundSale(sale.id); loadReport(); }
        catch { Alert.alert('Error', 'Failed to refund sale'); }
        finally { setActionSaleId(null); }
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Sales Report</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.key} style={[styles.periodBtn, period === p.key && styles.periodBtnActive]} onPress={() => setPeriod(p.key)}>
            <Text style={[styles.periodBtnText, period === p.key && styles.periodBtnTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 40 }} /> : report && (
        <ScrollView contentContainerStyle={{ padding: 15, paddingBottom: 40 }}>
          {/* Summary cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Sales</Text>
              <Text style={styles.summaryValue}>₱{parseFloat(report.total_sales).toFixed(2)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Transactions</Text>
              <Text style={styles.summaryValue}>{report.total_transactions}</Text>
            </View>
          </View>

          {/* Top products */}
          {report.top_products.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 Top Products</Text>
              {report.top_products.map((p: any, i: number) => (
                <View key={i} style={styles.topProductRow}>
                  <Text style={styles.topProductRank}>#{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topProductName}>{p.product_name}</Text>
                    <Text style={styles.topProductSub}>Qty sold: {p.qty}</Text>
                  </View>
                  <Text style={styles.topProductRevenue}>₱{parseFloat(p.revenue).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Recent sales */}
          <Text style={styles.sectionTitle}>🧾 Recent Transactions</Text>
          {report.sales.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet</Text>
          ) : report.sales.map((sale: any) => (
            <View key={sale.id} style={styles.saleCard}>
              <View style={styles.saleRow}>
                <Text style={styles.saleReceipt}>{sale.receipt_number}</Text>
                <Text style={styles.saleTotal}>₱{parseFloat(sale.total).toFixed(2)}</Text>
              </View>
              <View style={styles.saleRow}>
                <Text style={styles.saleSub}>Cashier: {sale.cashier_name}</Text>
                <Text style={[styles.saleSub, { color: sale.payment_method === 'CASH' ? '#4CAF50' : '#0070E0' }]}>{sale.payment_method}</Text>
              </View>
              <View style={styles.saleRow}>
                <Text style={[styles.statusBadge, sale.status === 'COMPLETED' && styles.statusCompleted, sale.status === 'VOIDED' && styles.statusVoided, sale.status === 'REFUNDED' && styles.statusRefunded]}>
                  {sale.status}
                </Text>
                {sale.status === 'COMPLETED' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.voidBtn, actionSaleId === sale.id && { opacity: 0.5 }]}
                      onPress={() => handleVoid(sale)}
                      disabled={actionSaleId === sale.id}
                    >
                      <Text style={styles.actionBtnText}>Void</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.refundBtn, actionSaleId === sale.id && { opacity: 0.5 }]}
                      onPress={() => handleRefund(sale)}
                      disabled={actionSaleId === sale.id}
                    >
                      <Text style={styles.actionBtnText}>Refund</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <Text style={styles.saleDate}>{new Date(sale.created_at).toLocaleString()}</Text>
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  periodRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  periodBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 2, borderColor: '#ddd', alignItems: 'center' },
  periodBtnActive: { borderColor: '#ED1C24', backgroundColor: '#FFF0F0' },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
  periodBtnTextActive: { color: '#ED1C24' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  summaryLabel: { fontSize: 12, color: '#999', marginBottom: 6 },
  summaryValue: { fontSize: 22, fontWeight: 'bold', color: '#ED1C24' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  topProductRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  topProductRank: { fontSize: 18, fontWeight: 'bold', color: '#ED1C24', width: 28 },
  topProductName: { fontSize: 14, fontWeight: '600', color: '#333' },
  topProductSub: { fontSize: 12, color: '#999' },
  topProductRevenue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  saleCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  saleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  saleReceipt: { fontSize: 13, fontWeight: '600', color: '#333' },
  saleTotal: { fontSize: 14, fontWeight: 'bold', color: '#ED1C24' },
  saleSub: { fontSize: 12, color: '#999' },
  saleDate: { fontSize: 11, color: '#bbb', marginTop: 4 },
  statusBadge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  statusCompleted: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  statusVoided: { backgroundColor: '#FDECEA', color: '#C62828' },
  statusRefunded: { backgroundColor: '#E3F2FD', color: '#1565C0' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  voidBtn: { backgroundColor: '#C62828' },
  refundBtn: { backgroundColor: '#1565C0' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20, fontSize: 14 },
});
