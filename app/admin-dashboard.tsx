import { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deliveryAPI, authAPI } from '../services/api';
import { Box, ChartColumn, ChevronRight, Home, LayoutDashboard, LifeBuoy, PackageCheck, ShieldUser, UserRound, Users } from 'lucide-react-native';

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const [activeNav, setActiveNav] = useState('home');
  const [stats, setStats] = useState({
    totalRiders: 0,
    activeRiders: 0,
    onlineRiders: 0,
    totalDeliveries: 0,
    pendingApprovals: 0,
    totalCustomers: 0,
    activeDeliveries: 0,
    completedDeliveries: 0,
  });
  const [loading, setLoading] = useState(true);
  const navSafeInset = Math.max(insets.bottom, 0);
  const navHeightCompensation = 72 + navSafeInset;

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [deliveriesRes, ridersRes, customersRes] = await Promise.all([
        deliveryAPI.getAllDeliveries(),
        deliveryAPI.getAllRiders().catch(() => ({ data: [] })),
        authAPI.getCustomers().catch(() => ({ data: [] })),
      ]);

      const deliveries = deliveriesRes.data;
      const riders = ridersRes.data || [];
      const customers = customersRes.data || [];

      setStats({
        totalRiders: riders.length,
        activeRiders: riders.filter((r: any) => r.is_approved).length,
        onlineRiders: riders.filter((r: any) => r.is_online && r.is_approved).length,
        totalDeliveries: deliveries.length,
        pendingApprovals: deliveries.filter((d: any) => !d.is_approved).length,
        totalCustomers: customers.length,
        activeDeliveries: deliveries.filter((d: any) => ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(d.status)).length,
        completedDeliveries: deliveries.filter((d: any) => d.status === 'DELIVERED').length,
      });
    } catch (error: any) {
      console.log('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <ShieldUser size={20} color="#fff" strokeWidth={2.2} />
          <Text style={styles.headerTitle}>Admin Control Panel</Text>
        </View>
        <Text style={styles.headerSubtitle}>System Overview and Management</Text>
      </View>

      <ScrollView style={[styles.container, { marginBottom: navHeightCompensation }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ED1C24" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.statNumber}>{stats.totalCustomers}</Text>
                <Text style={styles.statLabel}>Customers</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#2196F3' }]}>
                <Text style={styles.statNumber}>{stats.onlineRiders}/{stats.activeRiders}</Text>
                <Text style={styles.statLabel}>Online Riders</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FF9800' }]}>
                <Text style={styles.statNumber}>{stats.activeDeliveries}</Text>
                <Text style={styles.statLabel}>Active Deliveries</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#ED1C24' }]}>
                <Text style={styles.statNumber}>{stats.pendingApprovals}</Text>
                <Text style={styles.statLabel}>Pending Approvals</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Users size={18} color="#333" strokeWidth={2.2} />
                <Text style={styles.cardTitle}>User Management</Text>
              </View>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-users')}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Manage Customers</Text>
                  <Text style={styles.menuSubtext}>{stats.totalCustomers} customers registered</Text>
                </View>
                <ChevronRight size={18} color="#bbb" strokeWidth={2.4} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-riders')}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Manage Riders</Text>
                  <Text style={styles.menuSubtext}>{stats.onlineRiders} online | {stats.activeRiders - stats.onlineRiders} offline | {stats.completedDeliveries} completed</Text>
                </View>
                <ChevronRight size={18} color="#bbb" strokeWidth={2.4} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-cashiers')}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Manage Cashiers</Text>
                  <Text style={styles.menuSubtext}>Approve and manage POS cashiers</Text>
                </View>
                <ChevronRight size={18} color="#bbb" strokeWidth={2.4} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-branches')}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Manage Hubs</Text>
                  <Text style={styles.menuSubtext}>Create and pin JRNZ hub locations on the map</Text>
                </View>
                <ChevronRight size={18} color="#bbb" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <PackageCheck size={18} color="#333" strokeWidth={2.2} />
                <Text style={styles.cardTitle}>Delivery Operations</Text>
              </View>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-deliveries')}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Manage Deliveries</Text>
                  <Text style={styles.menuSubtext}>{stats.activeDeliveries} live | {stats.totalDeliveries} total | {stats.pendingApprovals} pending approval</Text>
                </View>
                <ChevronRight size={18} color="#bbb" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Box size={18} color="#333" strokeWidth={2.2} />
                <Text style={styles.cardTitle}>Transactions</Text>
              </View>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/cashier-parcel-history')}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Transaction History</Text>
                  <Text style={styles.menuSubtext}>View accepted parcels and waybill records</Text>
                </View>
                <ChevronRight size={18} color="#bbb" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <LifeBuoy size={18} color="#333" strokeWidth={2.2} />
                <Text style={styles.cardTitle}>Support and Applications</Text>
              </View>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-support-tickets')}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Support Tickets</Text>
                  <Text style={styles.menuSubtext}>View rider/cashier applications and general inquiries</Text>
                </View>
                <ChevronRight size={18} color="#bbb" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <ChartColumn size={18} color="#333" strokeWidth={2.2} />
                <Text style={styles.cardTitle}>Reporting and Insights</Text>
              </View>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/analytics-dashboard')}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Admin Reporting Dashboard</Text>
                  <Text style={styles.menuSubtext}>Unified view for operations, revenue, and ratings</Text>
                </View>
                <ChevronRight size={18} color="#bbb" strokeWidth={2.4} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-low-rated-riders')}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Low-Rated Riders</Text>
                  <Text style={styles.menuSubtext}>Riders needing performance review</Text>
                </View>
                <ChevronRight size={18} color="#bbb" strokeWidth={2.4} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications')}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuText}>Notifications</Text>
                  <Text style={styles.menuSubtext}>View and manage system alerts</Text>
                </View>
                <ChevronRight size={18} color="#bbb" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: 10 + navSafeInset }]}>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setActiveNav('home'); router.replace('/admin-dashboard'); }}>
          <Home size={20} color={activeNav === 'home' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          <Text style={[styles.navText, activeNav === 'home' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setActiveNav('deliveries'); router.push('/admin-deliveries'); }}>
          <PackageCheck size={20} color={activeNav === 'deliveries' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          <Text style={[styles.navText, activeNav === 'deliveries' && styles.navTextActive]}>Deliveries</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setActiveNav('reports'); router.push('/analytics-dashboard'); }}>
          <LayoutDashboard size={20} color={activeNav === 'reports' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          <Text style={[styles.navText, activeNav === 'reports' && styles.navTextActive]}>Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => { setActiveNav('profile'); router.push('/admin-profile'); }}>
          <UserRound size={20} color={activeNav === 'profile' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          <Text style={[styles.navText, activeNav === 'profile' && styles.navTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#1a1a1a', borderBottomWidth: 3, borderBottomColor: '#ED1C24' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: '#ccc' },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 50 },
  loadingText: { marginTop: 15, fontSize: 16, color: '#666' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 },
  statCard: { flex: 1, minWidth: '47%', borderRadius: 12, padding: 12, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#fff', textAlign: 'center', opacity: 0.9 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, margin: 10, marginTop: 0, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  menuContent: { flex: 1 },
  menuText: { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 2 },
  menuSubtext: { fontSize: 11, color: '#999' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#ddd', elevation: 10 },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 2 },
  navText: { fontSize: 11, color: '#666' },
  navTextActive: { color: '#ED1C24', fontWeight: '600' },
});
