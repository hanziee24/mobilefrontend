import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { deliveryAPI, walletAPI } from '../services/api';
import { ArrowLeft, Clock3, DollarSign, Gift, Home, Package, UserRound, Wallet } from 'lucide-react-native';

interface Transaction {
  id: number;
  transaction_type: string;
  amount: string;
  balance_after: string;
  description: string;
  created_at: string;
  delivery?: { id: number; tracking_number: string } | null;
  delivery_tracking?: string | null;
}

export default function EarningsTracker() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeNav, setActiveNav] = useState('earnings');
  const [period, setPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [stats, setStats] = useState({
    today_earnings: 0,
    week_earnings: 0,
    month_earnings: 0,
    total_earnings: 0,
    today_count: 0,
    week_count: 0,
    total_completed: 0,
    wallet_balance: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchEarnings();
    const interval = setInterval(fetchEarnings, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (period === 'history') fetchTransactions();
  }, [period]);

  useEffect(() => {
    if (tab && ['home', 'deliveries', 'earnings', 'profile'].includes(tab)) {
      setActiveNav(tab);
    }
  }, [tab]);

  const fetchEarnings = async () => {
    try {
      const response = await deliveryAPI.getRiderStats();
      setStats(response.data);
    } catch (error: any) {
      if (error.response?.status !== 403) console.log('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setTxLoading(true);
    try {
      const response = await walletAPI.getTransactions();
      setTransactions(response.data);
    } catch (error: any) {
      console.log('Error fetching transactions:', error);
    } finally {
      setTxLoading(false);
    }
  };

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'EARNING':
        return <DollarSign size={18} color="#4CAF50" strokeWidth={2.2} />;
      case 'WITHDRAWAL':
        return <Wallet size={18} color="#f44336" strokeWidth={2.2} />;
      case 'BONUS':
        return <Gift size={18} color="#4CAF50" strokeWidth={2.2} />;
      default:
        return <DollarSign size={18} color="#4CAF50" strokeWidth={2.2} />;
    }
  };

  const getTxColor = (type: string) => (type === 'WITHDRAWAL' ? '#f44336' : '#4CAF50');

  const periodAmount = period === 'daily' ? stats.today_earnings : period === 'weekly' ? stats.week_earnings : stats.month_earnings;
  const periodCount = period === 'daily' ? stats.today_count : period === 'weekly' ? stats.week_count : stats.total_completed;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.title}>Earnings Tracker</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.tabs}>
        {['daily', 'weekly', 'monthly', 'history'].map((item) => (
          <TouchableOpacity key={item} style={[styles.tab, period === item && styles.activeTab]} onPress={() => setPeriod(item)}>
            <Text style={[styles.tabText, period === item && styles.activeTabText]}>
              {item === 'daily' ? 'Daily' : item === 'weekly' ? 'Weekly' : item === 'monthly' ? 'Monthly' : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 110 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 50 }} />
        ) : period === 'history' ? (
          <>
            <View style={styles.walletCard}>
              <Text style={styles.walletLabel}>Wallet Balance</Text>
              <Text style={styles.walletAmount}>PHP {stats.wallet_balance.toFixed(2)}</Text>
              <Text style={styles.walletSub}>Lifetime Earned: PHP {stats.total_earnings.toFixed(2)}</Text>
            </View>

            {txLoading ? (
              <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 30 }} />
            ) : transactions.length === 0 ? (
              <Text style={styles.emptyText}>No transactions yet</Text>
            ) : (
              transactions.map((tx) => (
                <View key={tx.id} style={styles.txCard}>
                  <View style={styles.txLeft}>
                    <View style={styles.txIconWrap}>{getTxIcon(tx.transaction_type)}</View>
                    <View>
                      <Text style={styles.txDesc}>{tx.description}</Text>
                      {(tx.delivery?.tracking_number || tx.delivery_tracking) ? (
                        <Text style={styles.txTracking}>#{tx.delivery?.tracking_number || tx.delivery_tracking}</Text>
                      ) : null}
                      <View style={styles.txDateRow}>
                        <Clock3 size={11} color="#999" strokeWidth={2.2} />
                        <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: getTxColor(tx.transaction_type) }]}>
                      {tx.transaction_type === 'WITHDRAWAL' ? '-' : '+'}PHP {Math.abs(parseFloat(tx.amount)).toFixed(2)}
                    </Text>
                    <Text style={styles.txBalance}>Bal: PHP {parseFloat(tx.balance_after).toFixed(2)}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                {period === 'daily' ? "Today's Earnings" : period === 'weekly' ? "This Week's Earnings" : "This Month's Earnings"}
              </Text>
              <Text style={styles.summaryAmount}>PHP {periodAmount.toFixed(2)}</Text>
              <View style={styles.totalEarningsRow}>
                <Text style={styles.totalEarningsLabel}>Lifetime Total: </Text>
                <Text style={styles.totalEarningsValue}>PHP {stats.total_earnings.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.earningCard}>
              <View style={styles.earningHeader}>
                <Text style={styles.earningDate}>{period === 'daily' ? 'Today' : period === 'weekly' ? 'This Week' : 'This Month'}</Text>
                <Text style={styles.earningTotal}>PHP {periodAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.earningDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Deliveries</Text>
                  <Text style={styles.detailValue}>{periodCount}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Earnings</Text>
                  <Text style={styles.detailValue}>PHP {periodAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Wallet</Text>
                  <Text style={styles.detailValue}>PHP {stats.wallet_balance.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setActiveNav('home'); router.replace('/rider-dashboard?tab=home'); }}>
          <Home size={20} color={activeNav === 'home' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          <Text style={[styles.navText, activeNav === 'home' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setActiveNav('deliveries'); router.replace('/rider-deliveries?tab=deliveries'); }}>
          <Package size={20} color={activeNav === 'deliveries' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          <Text style={[styles.navText, activeNav === 'deliveries' && styles.navTextActive]}>Deliveries</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveNav('earnings')}>
          <DollarSign size={20} color={activeNav === 'earnings' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          <Text style={[styles.navText, activeNav === 'earnings' && styles.navTextActive]}>Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setActiveNav('profile'); router.push('/rider-profile'); }}>
          <UserRound size={20} color={activeNav === 'profile' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          <Text style={[styles.navText, activeNav === 'profile' && styles.navTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, gap: 6 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#f5f5f5' },
  activeTab: { backgroundColor: '#ED1C24' },
  tabText: { fontSize: 11, color: '#666', fontWeight: '600' },
  activeTabText: { color: '#fff' },
  content: { flex: 1, padding: 15 },
  summaryCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryLabel: { fontSize: 14, color: '#fff', opacity: 0.9 },
  summaryAmount: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginTop: 5 },
  totalEarningsRow: {
    flexDirection: 'row',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  totalEarningsLabel: { fontSize: 13, color: '#fff', opacity: 0.9 },
  totalEarningsValue: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  earningCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  earningDate: { fontSize: 16, fontWeight: '600', color: '#333' },
  earningTotal: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50' },
  earningDetails: { flexDirection: 'row', justifyContent: 'space-around' },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#333' },
  walletCard: {
    backgroundColor: '#ED1C24',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  walletLabel: { fontSize: 13, color: '#fff', opacity: 0.9 },
  walletAmount: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginVertical: 6 },
  walletSub: { fontSize: 13, color: '#fff', opacity: 0.8 },
  txCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  txIconWrap: { width: 28, alignItems: 'center' },
  txDesc: { fontSize: 13, fontWeight: '600', color: '#333', maxWidth: 180 },
  txTracking: { fontSize: 11, color: '#ED1C24', marginTop: 2 },
  txDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  txDate: { fontSize: 11, color: '#999' },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: 'bold' },
  txBalance: { fontSize: 11, color: '#999', marginTop: 2 },
  emptyText: { textAlign: 'center', fontSize: 14, color: '#999', marginTop: 50 },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    elevation: 10,
  },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 5, gap: 4 },
  navText: { fontSize: 12, color: '#666' },
  navTextActive: { color: '#ED1C24', fontWeight: '600' },
});
