import { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Text, Dimensions, Linking, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { deliveryAPI, notificationAPI } from '../services/api';
import { Bell, House, Package2, UserRound, Truck, Package, CircleDot, MessageCircle, Star, ClipboardList, Zap, MapPin } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface RiderDetails {
  first_name: string;
  last_name: string;
  phone: string;
}

interface Delivery {
  id: number;
  tracking_number: string;
  status: string;
  progress: number;
  estimated_time: string;
  rider_details?: RiderDetails;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function CustomerDashboard() {
  const [activeNav, setActiveNav] = useState('home');
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [allDeliveries, setAllDeliveries] = useState<Delivery[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [activeRes, allRes, notifRes, countRes] = await Promise.all([
        deliveryAPI.getActiveDeliveries(),
        deliveryAPI.getAllDeliveries(),
        notificationAPI.getNotifications(),
        notificationAPI.getUnreadCount(),
      ]);
      setActiveDeliveries(activeRes.data);
      setAllDeliveries(allRes.data);
      setNotifications(notifRes.data.slice(0, 3));
      setUnreadCount(countRes.data.count);
    } catch (error: any) {
      if (error.response?.status !== 403 && error.response?.status !== 401) {
        console.log('Error fetching data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const banners = [
    { id: 1, title: 'Fast Delivery', subtitle: 'Get your packages on time', color: '#ED1C24' },
    { id: 2, title: 'Track Anytime', subtitle: 'Real-time GPS tracking', color: '#FF6B6B' },
    { id: 3, title: 'Safe & Secure', subtitle: 'Your packages are protected', color: '#FF8E8E' },
  ];

  const completedCount = allDeliveries.filter((d) => d.status === 'DELIVERED').length;
  const cancelledCount = allDeliveries.filter((d) => d.status === 'CANCELLED').length;

  return (
    <View style={styles.wrapper}>
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity style={styles.notifButton} onPress={() => router.push('/notifications')}>
          <Bell size={24} color="#333" strokeWidth={2.2} />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.bannerContainer}>
          <ScrollView
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            snapToInterval={width}
            decelerationRate="fast"
            onScroll={(e) => setActiveBanner(Math.round(e.nativeEvent.contentOffset.x / width))}
            scrollEventThrottle={16}
          >
            {banners.map((banner) => (
              <View key={banner.id} style={styles.bannerWrapper}>
                <View style={[styles.banner, { backgroundColor: banner.color }]}>
                  <Text style={styles.bannerTitle}>{banner.title}</Text>
                  <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.pagination}>
            {banners.map((_, index) => (
              <View key={index} style={[styles.dot, activeBanner === index && styles.activeDot]} />
            ))}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/delivery-status')}>
            <Text style={styles.statNumber}>{activeDeliveries.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/order-history')}>
            <Text style={styles.statNumber}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/order-history')}>
            <Text style={styles.statNumber}>{cancelledCount}</Text>
            <Text style={styles.statLabel}>Cancelled</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Truck size={18} color="#333" strokeWidth={2.2} />
            <Text style={styles.cardTitle}>Active Deliveries</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#ED1C24" style={{ marginVertical: 20 }} />
          ) : activeDeliveries.length === 0 ? (
            <View style={styles.emptyDeliveries}>
              <Package size={42} color="#ED1C24" strokeWidth={1.8} />
              <Text style={styles.emptyText}>No active deliveries</Text>
            </View>
          ) : (
            activeDeliveries.map((delivery) => (
              <View key={delivery.id} style={styles.deliveryItem}>
                <View style={styles.deliveryIcon}>
                  <Package size={20} color="#ED1C24" strokeWidth={2.2} />
                </View>
                <View style={styles.deliveryInfo}>
                  <Text style={styles.deliveryId}>{delivery.tracking_number}</Text>
                  <View style={styles.deliveryStatusRow}>
                    <CircleDot size={13} color={delivery.status === 'IN_TRANSIT' ? '#2E7D32' : '#F9A825'} strokeWidth={2.2} />
                    <Text style={styles.deliveryStatus}>{delivery.status.replace(/_/g, ' ')}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${delivery.progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{delivery.progress}% | ETA: {delivery.estimated_time || 'Calculating...'}</Text>
                </View>
                <View style={styles.deliveryActions}>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => router.push({ pathname: '/track-delivery', params: { id: String(delivery.id) } })}
                  >
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                  {delivery.rider_details && (
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() =>
                        Alert.alert(
                          'Contact Rider',
                          `${delivery.rider_details!.first_name} ${delivery.rider_details!.last_name}\nPhone: ${delivery.rider_details!.phone}`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Call', onPress: () => Linking.openURL(`tel:${delivery.rider_details!.phone}`) },
                            { text: 'Message', onPress: () => router.push('/contact-rider') },
                          ]
                        )
                      }
                    >
                      <MessageCircle size={16} color="#ED1C24" strokeWidth={2.2} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/delivery-status')}>
            <Text style={styles.viewAllText}>View All Deliveries</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Zap size={18} color="#333" strokeWidth={2.2} />
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ED1C24' }]} onPress={() => router.push('/create-delivery')}>
              <Package size={24} color="#fff" strokeWidth={2.2} />
              <Text style={styles.actionBtnText}>Send Parcel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFA726' }]} onPress={() => router.push('/rate-rider')}>
              <Star size={24} color="#fff" strokeWidth={2.2} />
              <Text style={styles.actionBtnText}>Rate Rider</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]} onPress={() => router.push('/order-history')}>
              <ClipboardList size={24} color="#fff" strokeWidth={2.2} />
              <Text style={styles.actionBtnText}>Order History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1565C0' }]} onPress={() => router.push('/find-hub')}>
              <MapPin size={24} color="#fff" strokeWidth={2.2} />
              <Text style={styles.actionBtnText}>Find a Hub</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Bell size={18} color="#333" strokeWidth={2.2} />
            <Text style={styles.cardTitle}>Recent Notifications</Text>
          </View>
          {notifications.length === 0 ? (
            <Text style={styles.emptyText}>No new notifications</Text>
          ) : (
            notifications.map((notif) => (
              <TouchableOpacity key={notif.id} style={styles.notificationItem} onPress={() => router.push('/notifications')}>
                <View style={styles.notifDot}>
                  <CircleDot size={12} color={notif.is_read ? '#BDBDBD' : '#2E7D32'} strokeWidth={2.2} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.notifMessage}>{notif.message}</Text>
                  <Text style={styles.notifTime}>{new Date(notif.created_at).toLocaleString()}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/notifications')}>
            <Text style={styles.viewAllText}>View All Notifications</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => setActiveNav('home')}>
          <View style={styles.navIcon}>
            <House size={20} color={activeNav === 'home' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          </View>
          <Text style={[styles.navText, activeNav === 'home' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => { setActiveNav('orders'); router.replace('/order-history?tab=orders'); }}>
          <View style={styles.navIcon}>
            <Package2 size={20} color={activeNav === 'orders' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          </View>
          <Text style={[styles.navText, activeNav === 'orders' && styles.navTextActive]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => { setActiveNav('profile'); router.push('/customer-profile'); }}>
          <View style={styles.navIcon}>
            <UserRound size={20} color={activeNav === 'profile' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          </View>
          <Text style={[styles.navText, activeNav === 'profile' && styles.navTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f5f5f5' },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  notifButton: { position: 'relative' },
  notifBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ED1C24', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  container: { flex: 1 },
  bannerContainer: { marginTop: 15 },
  bannerWrapper: { width, paddingHorizontal: 15 },
  banner: { width: width - 30, height: 120, borderRadius: 15, padding: 20, justifyContent: 'center' },
  bannerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  bannerSubtitle: { fontSize: 14, color: '#fff', opacity: 0.9 },
  pagination: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  activeDot: { backgroundColor: '#ED1C24', width: 24 },
  statsContainer: { flexDirection: 'row', padding: 15, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#ED1C24', marginBottom: 5 },
  statLabel: { fontSize: 12, color: '#666' },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 20, margin: 15, marginTop: 0, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptyDeliveries: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
  deliveryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 10 },
  deliveryIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center' },
  deliveryInfo: { flex: 1 },
  deliveryId: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  deliveryStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  deliveryStatus: { fontSize: 12, color: '#666' },
  progressBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden', marginBottom: 3 },
  progressFill: { height: '100%', backgroundColor: '#4CAF50' },
  progressText: { fontSize: 11, color: '#999' },
  deliveryActions: { gap: 6 },
  viewButton: { backgroundColor: '#ED1C24', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  contactButton: { backgroundColor: '#FFF0F0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  viewAllBtn: { paddingTop: 12, alignItems: 'center' },
  viewAllText: { color: '#ED1C24', fontWeight: '600', fontSize: 14 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 12, alignItems: 'center', gap: 6 },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  notificationItem: { flexDirection: 'row', padding: 12, backgroundColor: '#f9f9f9', borderRadius: 10, marginBottom: 8, gap: 10 },
  notifDot: { marginTop: 2, width: 14, alignItems: 'center' },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  notifMessage: { fontSize: 12, color: '#666', marginBottom: 2 },
  notifTime: { fontSize: 11, color: '#999' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#ddd', elevation: 10 },
  navButton: { flex: 1, alignItems: 'center', paddingVertical: 5 },
  navIcon: { marginBottom: 4, height: 22, justifyContent: 'center', alignItems: 'center' },
  navText: { fontSize: 12, color: '#666' },
  navTextActive: { color: '#ED1C24', fontWeight: '600' },
});
