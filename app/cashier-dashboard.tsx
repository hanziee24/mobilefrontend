import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { router } from 'expo-router';
import { Bell, ChevronRight, Handshake, History, LogOut, Menu, PackageCheck, PackageSearch, User, Wallet } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { authAPI, deliveryAPI, notificationAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MENU_ITEMS = [
  { icon: PackageCheck, label: 'Accept Parcel', sub: 'Drop-off  Collect fee  Waybill', route: '/cashier-create-delivery', highlight: true },
  { icon: History, label: 'Parcel History', sub: 'View accepted parcels & waybills', route: '/cashier-parcel-history', highlight: false },
  { icon: Bell, label: 'Notifications', sub: 'View system alerts', route: '/notifications', highlight: false, badge: true },
];

export default function CashierDashboard() {
  const [user, setUser] = useState<any>(null);
  const [todayStats, setTodayStats] = useState({ parcels_accepted: 0, fees_collected: 0 });
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, deliveriesRes, requestsRes, countRes] = await Promise.all([
        authAPI.getProfile(),
        deliveryAPI.getAllDeliveries(),
        deliveryAPI.getDeliveryRequests(),
        notificationAPI.getUnreadCount(),
      ]);
      setUser(profileRes.data);
      setPendingRequests(requestsRes.data);
      setUnreadCount(countRes.data.count);
      const today = new Date().toDateString();
      const todayDeliveries = deliveriesRes.data.filter((d: any) => new Date(d.created_at).toDateString() === today);
      setTodayStats({
        parcels_accepted: todayDeliveries.length,
        fees_collected: todayDeliveries.reduce((sum: number, d: any) => sum + (parseFloat(d.delivery_fee) || 0), 0),
      });
    } catch (error) {
      console.log('Failed to load cashier dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleAcceptRequest = async (req: any) => {
    try {
      // Optimistically remove from the current queue to prevent double-accept taps
      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
      await AsyncStorage.setItem('prefill_delivery_request', JSON.stringify(req));
      router.push('/cashier-create-delivery');
    } catch {
      // Reload to recover if prefill write/navigation fails
      fetchData();
      Alert.alert('Error', 'Failed to open request');
    }
  };

  const handleDismissRequest = async (req: any) => {
    Alert.alert('Dismiss Request', 'Remove this request from the queue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Dismiss', style: 'destructive', onPress: async () => {
        try {
          await deliveryAPI.cancelDeliveryRequest(req.id);
          setPendingRequests(prev => prev.filter(r => r.id !== req.id));
        } catch { Alert.alert('Error', 'Failed to dismiss'); }
      }},
    ]);
  };

  const handleLogout = () => {
    setMenuVisible(false);
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await authAPI.logout(); router.replace('/auth'); } },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ED1C24" />
      </View>
    );
  }

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.greetingRow}>
            <Text style={styles.headerGreeting}>{greeting}</Text>
            <Handshake size={14} color="rgba(255,255,255,0.9)" strokeWidth={2.2} />
          </View>
          <Text style={styles.headerName}>{user?.first_name} {user?.last_name}</Text>
          <View style={styles.roleBadge}>
            <View style={styles.roleDot} />
            <Text style={styles.roleBadgeText}>Cashier</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuVisible(true)}>
          <Menu size={22} color="#fff" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.dropdown}>
            <View style={styles.dropdownHeader}>
              <View style={styles.dropdownAvatar}>
                <Text style={styles.dropdownAvatarText}>{initials}</Text>
              </View>
              <View>
                <Text style={styles.dropdownName}>{user?.first_name} {user?.last_name}</Text>
                <Text style={styles.dropdownRole}>Cashier</Text>
              </View>
            </View>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setMenuVisible(false); router.push('/cashier-profile'); }}>
              <User size={18} color="#333" strokeWidth={2} />
              <Text style={styles.dropdownItemText}>My Profile</Text>
            </TouchableOpacity>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
              <LogOut size={18} color="#C62828" strokeWidth={2} />
              <Text style={[styles.dropdownItemText, { color: '#C62828' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <PackageSearch size={22} color="#1a1a1a" strokeWidth={2.2} />
            <Text style={styles.statNumber}>{todayStats.parcels_accepted}</Text>
            <Text style={styles.statLabel}>Parcels Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Wallet size={22} color="#1a1a1a" strokeWidth={2.2} />
            <Text style={styles.statNumber}>PHP {todayStats.fees_collected.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Fees Collected</Text>
          </View>
        </View>

        <View style={styles.dateStrip}>
          <Text style={styles.dateText}>
            {now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {pendingRequests.length > 0 && (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>📬 CUSTOMER REQUESTS ({pendingRequests.length})</Text>
            {pendingRequests.map(req => (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{req.sender_name} → {req.receiver_name}</Text>
                  <Text style={styles.requestDetail}>{req.item_type} • {req.weight}kg • Qty: {req.quantity}{req.is_fragile ? ' • ⚠️ Fragile' : ''}</Text>
                  <Text style={styles.requestAddress} numberOfLines={1}>📍 {req.receiver_address}</Text>
                  {req.preferred_payment_method && (
                    <Text style={styles.requestPayment}>💳 Prefers: {req.preferred_payment_method.replace('_', ' ')}</Text>
                  )}
                </View>
                <View style={styles.requestBtns}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRequest(req)}>
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dismissBtn} onPress={() => handleDismissRequest(req)}>
                    <Text style={styles.dismissBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {pendingRequests.length === 0 && (
          <View style={styles.actionsSection}>
            <View style={styles.noRequestsBanner}>
              <Text style={styles.noRequestsText}>📭 No pending customer requests</Text>
            </View>
          </View>
        )}

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          {MENU_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.actionCard, item.highlight && styles.actionCardHighlight]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.85}
              >
                <View style={[styles.actionIconBox, item.highlight && styles.actionIconBoxHighlight]}>
                  <Icon size={20} color={item.highlight ? '#fff' : '#1a1a1a'} strokeWidth={2.2} />
                </View>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionTitle, item.highlight && { color: '#fff' }]}>{item.label}</Text>
                  <Text style={[styles.actionSub, item.highlight && { color: 'rgba(255,255,255,0.75)' }]}>{item.sub}</Text>
                </View>
                {item.badge && unreadCount > 0 ? (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{unreadCount}</Text>
                  </View>
                ) : (
                  <ChevronRight size={20} color={item.highlight ? 'rgba(255,255,255,0.6)' : '#ccc'} strokeWidth={2.2} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },

  header: { backgroundColor: '#ED1C24', paddingHorizontal: 20, paddingTop: 55, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  headerGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerName: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  roleBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  roleBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  menuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginTop: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 105, paddingRight: 16 },
  dropdown: { backgroundColor: '#fff', borderRadius: 14, width: 220, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, overflow: 'hidden' },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dropdownAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ED1C24', justifyContent: 'center', alignItems: 'center' },
  dropdownAvatarText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  dropdownName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  dropdownRole: { fontSize: 11, color: '#ED1C24', fontWeight: '600', marginTop: 2 },
  dropdownDivider: { height: 1, backgroundColor: '#f0f0f0' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dropdownItemText: { fontSize: 14, fontWeight: '600', color: '#333' },

  statsSection: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: -1, borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, padding: 20, gap: 10 },
  statCard: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#f0f0f0' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginTop: 6, marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#999', fontWeight: '500' },

  dateStrip: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  dateText: { fontSize: 12, color: '#888', fontWeight: '500', textAlign: 'center' },

  actionsSection: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 1, marginBottom: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, gap: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
  actionCardHighlight: { backgroundColor: '#ED1C24', elevation: 5 },
  actionIconBox: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#F4F6F9', justifyContent: 'center', alignItems: 'center' },
  actionIconBoxHighlight: { backgroundColor: 'rgba(255,255,255,0.2)' },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  actionSub: { fontSize: 12, color: '#999' },
  noRequestsBanner: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  noRequestsText: { fontSize: 13, color: '#bbb', fontWeight: '500' },
  menuBadge: { backgroundColor: '#ED1C24', borderRadius: 10, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  menuBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  requestCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#ED1C24', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  requestDetail: { fontSize: 12, color: '#666', marginBottom: 2 },
  requestAddress: { fontSize: 11, color: '#999' },
  requestPayment: { fontSize: 11, color: '#1565C0', fontWeight: '600', marginTop: 2 },
  requestBtns: { gap: 6 },
  acceptBtn: { backgroundColor: '#ED1C24', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  dismissBtn: { backgroundColor: '#f0f0f0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  dismissBtnText: { color: '#999', fontWeight: '700', fontSize: 13 },
});
