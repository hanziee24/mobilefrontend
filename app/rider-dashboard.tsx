import { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Text, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { deliveryAPI, authAPI } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  CircleDot,
  DollarSign,
  Home,
  MessageCircle,
  Navigation,
  Package,
  QrCode,
  Smartphone,
  Truck,
  UserRound,
} from 'lucide-react-native';

interface Delivery {
  id: number;
  tracking_number: string;
  delivery_address: string;
  delivery_fee: string;
  status: string;
  sender_name?: string;
  sender_contact?: string;
  receiver_name?: string;
  receiver_contact?: string;
}

export default function RiderDashboard() {
  const { t } = useLanguage();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeNav, setActiveNav] = useState('home');
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({ completed: 0, rating: 0, todayEarnings: 0, todayCount: 0, activeCount: 0, weekEarnings: 0 });
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const isSettingStatus = useRef(false);

  const fetchDeliveries = async () => {
    try {
      const res = await deliveryAPI.getActiveDeliveries();
      setDeliveries(res.data);
    } catch (error: any) {
      if (error.response?.status !== 403) console.log('Error fetching deliveries:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await deliveryAPI.getRiderStats();
      const d = res.data;
      setStats({
        completed: d.total_completed,
        rating: d.average_rating,
        todayEarnings: d.today_earnings,
        todayCount: d.today_count,
        activeCount: d.active_count,
        weekEarnings: d.week_earnings,
      });
    } catch (error: any) {
      if (error.response?.status !== 403) console.log('Error fetching stats:', error.message);
    }
  };

  const setRiderStatus = async (online: boolean) => {
    if (isSettingStatus.current) return;
    isSettingStatus.current = true;
    try {
      await authAPI.updateRiderStatus(online);
      setIsOnline(online);
    } catch (error) {
      console.log('Failed to set rider status:', error);
    } finally {
      isSettingStatus.current = false;
    }
  };

  useEffect(() => {
    fetchDeliveries();
    fetchStats();
    setRiderStatus(true);

    const interval = setInterval(() => {
      fetchDeliveries();
      fetchStats();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (tab && ['home', 'deliveries', 'earnings', 'profile'].includes(tab)) {
      setActiveNav(tab);
    }
  }, [tab]);

  const handleToggleAvailability = () => {
    const newStatus = !isOnline;
    Alert.alert(
      newStatus ? 'Going Online' : 'Going Offline',
      newStatus ? 'You will start receiving delivery requests.' : 'You will stop receiving new delivery requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => setRiderStatus(newStatus) },
      ]
    );
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Ready to Pick Up';
      case 'PICKED_UP':
        return 'Picked Up';
      case 'IN_TRANSIT':
        return 'In Transit';
      case 'OUT_FOR_DELIVERY':
        return 'Out for Delivery';
      case 'DELIVERED':
        return 'Delivered';
      default:
        return status.replace(/_/g, ' ');
    }
  };

  const handleCompleteFlow = (deliveryId: number) => {
    router.push({ pathname: '/rider-pos', params: { id: String(deliveryId), next: 'proof' } } as any);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Rider Dashboard</Text>
          <Bike size={18} color="#333" strokeWidth={2.2} />
        </View>
        <View style={styles.headerRight}>
          <LanguageSelector />
          <TouchableOpacity style={[styles.statusButton, !isOnline && styles.offlineButton]} onPress={handleToggleAvailability}>
            <CircleDot size={13} color={isOnline ? '#4CAF50' : '#D32F2F'} strokeWidth={2.4} />
            <Text style={[styles.statusText, !isOnline && styles.offlineText]}>{isOnline ? t('dashboard.online') : t('dashboard.offline')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>Today&apos;s Earnings</Text>
          <Text style={styles.earningsAmount}>PHP {stats.todayEarnings.toFixed(2)}</Text>
          <View style={styles.earningsStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.todayCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.activeCount}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>PHP {stats.weekEarnings.toFixed(0)}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.qrScanButton} onPress={() => router.push('/qr-confirmation-scanner' as any)}>
          <QrCode size={26} color="#fff" strokeWidth={2.2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.qrScanText}>Scan QR Code</Text>
            <Text style={styles.qrScanSubtext}>Pickup or Delivery Confirmation</Text>
          </View>
          <ArrowRight size={20} color="#fff" strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Package size={18} color="#333" strokeWidth={2.2} />
            <Text style={styles.cardTitle}>Active Deliveries</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#ED1C24" style={{ marginVertical: 15 }} />
          ) : deliveries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No active deliveries</Text>
              <Text style={styles.emptySubtext}>You&apos;ll see new deliveries here when assigned</Text>
            </View>
          ) : (
            deliveries.map((delivery) => (
              <View key={delivery.id} style={styles.deliveryCard}>
                <View style={styles.deliveryHeader}>
                  <View>
                    <Text style={styles.trackingNumber}>#{delivery.tracking_number}</Text>
                    <View style={styles.statusBadge}>
                      <CircleDot size={12} color={delivery.status === 'PENDING' ? '#FF9800' : delivery.status === 'DELIVERED' ? '#2E7D32' : '#1976D2'} strokeWidth={2.2} />
                      <Text style={styles.statusBadgeText}>{statusLabel(delivery.status)}</Text>
                    </View>
                  </View>
                  <Text style={styles.fee}>PHP {delivery.delivery_fee}</Text>
                </View>

                <View style={styles.deliveryDetails}>
                  <Text style={styles.detailLabel}>{t('delivery.sender')}</Text>
                  <Text style={styles.detailValue}>{delivery.sender_name}</Text>
                  <Text style={styles.detailValue}>Phone: {delivery.sender_contact}</Text>
                  <Text style={styles.detailLabel}>{t('delivery.receiver')}</Text>
                  <Text style={styles.detailValue}>{delivery.receiver_name}</Text>
                  <Text style={styles.detailValue}>Phone: {delivery.receiver_contact}</Text>
                  <Text style={styles.detailLabel}>Delivery Address</Text>
                  <Text style={styles.detailValue}>{delivery.delivery_address}</Text>
                </View>

                <View style={styles.actionRow}>
                  {delivery.status === 'PENDING' && (
                    <TouchableOpacity
                      style={[styles.primaryBtn, !isOnline && styles.disabledBtn]}
                      disabled={!isOnline}
                      onPress={() => {
                        if (!isOnline) {
                          Alert.alert('Offline', 'You must be online to pick up packages');
                          return;
                        }
                        Alert.alert('Pick Up Package', `Confirm pickup for ${delivery.tracking_number}?`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Confirm',
                            onPress: async () => {
                              try {
                                await deliveryAPI.updateStatus(delivery.id, 'PICKED_UP');
                                fetchDeliveries();
                              } catch {
                                Alert.alert('Error', 'Failed to update status');
                              }
                            },
                          },
                        ]);
                      }}
                    >
                      <View style={styles.btnRow}>
                        <Truck size={15} color="#fff" strokeWidth={2.4} />
                        <Text style={styles.primaryBtnText}>{t('delivery.pickup')}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {(delivery.status === 'PICKED_UP' || delivery.status === 'IN_TRANSIT') && (
                    <>
                      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/rider-navigation')}>
                        <View style={styles.btnRow}>
                          <Navigation size={15} color="#fff" strokeWidth={2.4} />
                          <Text style={styles.primaryBtnText}>Navigate</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.transitBtn} onPress={() => router.push({ pathname: '/update-status', params: { id: delivery.id } } as any)}>
                        <View style={styles.btnRow}>
                          <Truck size={15} color="#fff" strokeWidth={2.4} />
                          <Text style={styles.transitBtnText}>{delivery.status === 'PICKED_UP' ? 'In Transit' : 'Out for Delivery'}</Text>
                        </View>
                      </TouchableOpacity>
                    </>
                  )}
                  {delivery.status === 'OUT_FOR_DELIVERY' && (
                    <>
                      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/rider-navigation')}>
                        <View style={styles.btnRow}>
                          <Navigation size={15} color="#fff" strokeWidth={2.4} />
                          <Text style={styles.primaryBtnText}>Navigate</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleCompleteFlow(delivery.id)}>
                        <View style={styles.btnRow}>
                          <CheckCircle2 size={15} color="#fff" strokeWidth={2.4} />
                          <Text style={styles.secondaryBtnText}>{t('delivery.complete')}</Text>
                        </View>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                <View style={styles.quickActions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/delivery-qr', params: { id: delivery.id } } as any)}>
                    <Smartphone size={20} color="#333" strokeWidth={2.2} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/chat', params: { deliveryId: delivery.id, trackingNumber: delivery.tracking_number } } as any)}>
                    <MessageCircle size={20} color="#333" strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setActiveNav('home'); router.replace('/rider-dashboard?tab=home'); }}>
          <Home size={20} color={activeNav === 'home' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          <Text style={[styles.navText, activeNav === 'home' && styles.navTextActive]}>{t('dashboard.home')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setActiveNav('deliveries'); router.replace('/rider-deliveries?tab=deliveries'); }}>
          <Package size={20} color={activeNav === 'deliveries' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          <Text style={[styles.navText, activeNav === 'deliveries' && styles.navTextActive]}>{t('dashboard.deliveries')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setActiveNav('earnings'); router.push('/earnings-tracker?tab=earnings'); }}>
          <DollarSign size={20} color={activeNav === 'earnings' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          <Text style={[styles.navText, activeNav === 'earnings' && styles.navTextActive]}>{t('dashboard.earnings')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setActiveNav('profile'); router.push('/rider-profile'); }}>
          <UserRound size={20} color={activeNav === 'profile' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          <Text style={[styles.navText, activeNav === 'profile' && styles.navTextActive]}>{t('dashboard.profile')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusButton: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 },
  offlineButton: { backgroundColor: '#FFEBEE' },
  statusText: { fontSize: 13, fontWeight: '600', color: '#4CAF50' },
  offlineText: { color: '#D32F2F' },
  container: { flex: 1, marginBottom: 70 },
  earningsCard: { backgroundColor: '#ED1C24', margin: 15, padding: 20, borderRadius: 15, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8 },
  earningsTitle: { fontSize: 14, color: '#fff', opacity: 0.9 },
  earningsAmount: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginVertical: 10 },
  earningsStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 11, color: '#fff', opacity: 0.8, marginTop: 4 },
  qrScanButton: { backgroundColor: '#2196F3', marginHorizontal: 15, marginBottom: 15, padding: 18, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 4 },
  qrScanText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  qrScanSubtext: { color: '#fff', fontSize: 11, opacity: 0.9, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 20, margin: 15, marginTop: 0, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#666', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#999', marginTop: 5 },
  deliveryCard: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 15, marginTop: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  deliveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  trackingNumber: { fontSize: 16, fontWeight: 'bold', color: '#ED1C24', marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 12, color: '#666' },
  fee: { fontSize: 20, fontWeight: 'bold', color: '#4CAF50' },
  deliveryDetails: { marginBottom: 12 },
  detailLabel: { fontSize: 11, color: '#999', marginTop: 8, marginBottom: 2 },
  detailValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryBtn: { flex: 1, backgroundColor: '#ED1C24', padding: 12, borderRadius: 8, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#ccc', opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  secondaryBtn: { flex: 1, backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center' },
  secondaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  transitBtn: { flex: 1, backgroundColor: '#FF9800', padding: 12, borderRadius: 8, alignItems: 'center' },
  transitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  quickActions: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  iconBtn: { backgroundColor: '#fff', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#ddd', elevation: 10 },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 5, gap: 4 },
  navText: { fontSize: 12, color: '#666' },
  navTextActive: { color: '#ED1C24', fontWeight: '600' },
});
