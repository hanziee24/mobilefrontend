import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Bell, Boxes, ChartColumn, ChevronRight, House, LogOut, Mail, Phone, Settings, ShieldUser, Users, UserRound } from 'lucide-react-native';
import { authAPI, deliveryAPI, analyticsAPI } from '../services/api';

export default function AdminProfile() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const [profileRes, deliveriesRes, dashboardRes] = await Promise.all([
        authAPI.getProfile(),
        deliveryAPI.getAllDeliveries(),
        analyticsAPI.getDashboard().catch(() => ({ data: null })),
      ]);

      setUser(profileRes.data);
      const dashboardUsers = dashboardRes?.data?.users;
      setStats({
        totalDeliveries: deliveriesRes.data.length,
        totalUsers: dashboardUsers?.total ?? 0,
        pendingApprovals: deliveriesRes.data.filter((d: any) => !d.is_approved).length,
      });
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await authAPI.logout();
            router.replace('/auth');
          } catch (error) {
            console.log('Logout error:', error);
            await AsyncStorage.removeItem('accessToken');
            await AsyncStorage.removeItem('refreshToken');
            await AsyncStorage.removeItem('userType');
            router.replace('/auth');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ED1C24" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Profile</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <ShieldUser size={40} color="#ED1C24" strokeWidth={2.2} />
          </View>
          <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
          <View style={styles.roleRow}>
            <ShieldUser size={14} color="#ED1C24" strokeWidth={2.2} />
            <Text style={styles.role}>Administrator</Text>
          </View>
          <View style={styles.infoRow}>
            <Mail size={14} color="#666" strokeWidth={2.2} />
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Phone size={14} color="#666" strokeWidth={2.2} />
            <Text style={styles.phone}>{user?.phone}</Text>
          </View>
        </View>

        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalDeliveries}</Text>
              <Text style={styles.statLabel}>Total Deliveries</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.pendingApprovals}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        )}

        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-dashboard')}>
            <House size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.menuText}>Dashboard</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-deliveries')}>
            <Boxes size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.menuText}>Manage Deliveries</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-users')}>
            <Users size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.menuText}>Manage Users</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin-system-settings')}>
            <Settings size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.menuText}>System Settings</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/analytics-dashboard')}>
            <ChartColumn size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.menuText}>Reports</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications')}>
            <Bell size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.menuText}>Notifications</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <View style={styles.logoutInner}>
            <LogOut size={18} color="#ED1C24" strokeWidth={2.2} />
            <Text style={styles.logoutText}>Logout</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
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
  content: { flex: 1, padding: 15 },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  name: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  role: { fontSize: 14, color: '#ED1C24', fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  email: { fontSize: 14, color: '#666' },
  phone: { fontSize: 14, color: '#666' },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#ED1C24', marginBottom: 5 },
  statLabel: { fontSize: 12, color: '#666', textAlign: 'center' },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  menuText: { flex: 1, fontSize: 16, color: '#333', fontWeight: '500' },
  logoutButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ED1C24',
    marginBottom: 20,
  },
  logoutInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: '#ED1C24' },
});
