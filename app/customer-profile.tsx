import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Bell, ChevronRight, CircleHelp, CircleUserRound, CreditCard, LogOut, Mail, MapPin, Package, Phone, X } from 'lucide-react-native';
import { authAPI, deliveryAPI, supportAPI } from '../services/api';

export default function CustomerProfile() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', phone: '', address: '' });
  const [supportVisible, setSupportVisible] = useState(false);
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportConcern, setSupportConcern] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const [profileRes, deliveriesRes] = await Promise.all([
        authAPI.getProfile(),
        deliveryAPI.getAllDeliveries(),
      ]);

      setUser(profileRes.data);
      setEditForm({
        first_name: profileRes.data.first_name || '',
        last_name: profileRes.data.last_name || '',
        email: profileRes.data.email || '',
        phone: profileRes.data.phone || '',
        address: profileRes.data.address || '',
      });
      setSupportName(`${profileRes.data.first_name || ''} ${profileRes.data.last_name || ''}`.trim());
      setSupportEmail(profileRes.data.email || '');

      const myDeliveries = deliveriesRes.data.filter((d: any) => d.customer === profileRes.data.id);
      setStats({
        totalDeliveries: myDeliveries.length,
        activeDeliveries: myDeliveries.filter((d: any) => ['PENDING', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)).length,
        completedDeliveries: myDeliveries.filter((d: any) => d.status === 'DELIVERED').length,
      });
    } catch (error) {
      console.log('Profile fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      Alert.alert('Error', 'First name and last name are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(editForm);
      setUser(res.data);
      setEditVisible(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
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

  const handleOpenSupport = () => {
    setSupportConcern('');
    setSupportVisible(true);
  };

  const handleSubmitSupport = async () => {
    if (isSubmittingSupport) return;

    const name = supportName.trim();
    const email = supportEmail.trim().toLowerCase();
    const concern = supportConcern.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (name.length < 2) {
      Alert.alert('Invalid Input', 'Please enter your full name.');
      return;
    }
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Input', 'Please enter a valid email address.');
      return;
    }
    if (concern.length < 10) {
      Alert.alert('Invalid Input', 'Please provide more details about your concern.');
      return;
    }

    setIsSubmittingSupport(true);
    try {
      await supportAPI.createTicket({
        name,
        email,
        concern,
        concern_type: 'GENERAL',
      });
      setSupportConcern('');
      setSupportVisible(false);
      Alert.alert('Success', 'Your concern was sent. Support staff will contact you soon.');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to submit your concern. Please try again.');
    } finally {
      setIsSubmittingSupport(false);
    }
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
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <CircleUserRound size={40} color="#ED1C24" strokeWidth={2} />
          </View>
          <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
          <View style={styles.infoRow}>
            <Mail size={14} color="#666" strokeWidth={2} />
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Phone size={14} color="#666" strokeWidth={2} />
            <Text style={styles.phone}>{user?.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={14} color="#999" strokeWidth={2} />
            <Text style={styles.address}>{user?.address}</Text>
          </View>
        </View>

        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalDeliveries}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.activeDeliveries}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.completedDeliveries}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        )}

        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setEditVisible(true)}>
            <CircleUserRound size={20} color="#333" strokeWidth={2} />
            <Text style={styles.menuText}>Edit Profile</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/order-history')}>
            <Package size={20} color="#333" strokeWidth={2} />
            <Text style={styles.menuText}>Order History</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/customer-wallet')}>
            <CreditCard size={20} color="#333" strokeWidth={2} />
            <Text style={styles.menuText}>Customer Wallet</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications')}>
            <Bell size={20} color="#333" strokeWidth={2} />
            <Text style={styles.menuText}>Notifications</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleOpenSupport}>
            <CircleHelp size={20} color="#333" strokeWidth={2} />
            <Text style={styles.menuText}>Help & Support</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <View style={styles.logoutContent}>
            <LogOut size={18} color="#ED1C24" strokeWidth={2.2} />
            <Text style={styles.logoutText}>Logout</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={editVisible} animationType="slide" transparent onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <X size={20} color="#999" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.input}
              value={editForm.first_name}
              onChangeText={(v) => setEditForm((f) => ({ ...f, first_name: v }))}
              placeholder="First name"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={editForm.last_name}
              onChangeText={(v) => setEditForm((f) => ({ ...f, last_name: v }))}
              placeholder="Last name"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={editForm.email}
              onChangeText={(v) => setEditForm((f) => ({ ...f, email: v }))}
              placeholder="Email address"
              placeholderTextColor="#bbb"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={editForm.phone}
              onChangeText={(v) => setEditForm((f) => ({ ...f, phone: v }))}
              placeholder="09XXXXXXXXX"
              placeholderTextColor="#bbb"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={editForm.address}
              onChangeText={(v) => setEditForm((f) => ({ ...f, address: v }))}
              placeholder="Your address"
              placeholderTextColor="#bbb"
              multiline
            />

            <TouchableOpacity style={[styles.saveBtn, saving && { backgroundColor: '#ccc' }]} onPress={handleSaveProfile} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={supportVisible} animationType="slide" transparent onRequestClose={() => setSupportVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Help & Support</Text>
              <TouchableOpacity onPress={() => setSupportVisible(false)} disabled={isSubmittingSupport}>
                <X size={20} color="#999" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={supportName}
              onChangeText={setSupportName}
              placeholder="Full name"
              placeholderTextColor="#bbb"
              editable={!isSubmittingSupport}
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={supportEmail}
              onChangeText={setSupportEmail}
              placeholder="Email address"
              placeholderTextColor="#bbb"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSubmittingSupport}
            />

            <Text style={styles.inputLabel}>Concern</Text>
            <TextInput
              style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
              value={supportConcern}
              onChangeText={setSupportConcern}
              placeholder="Tell us how we can help..."
              placeholderTextColor="#bbb"
              multiline
              editable={!isSubmittingSupport}
            />

            <TouchableOpacity
              style={[styles.saveBtn, isSubmittingSupport && { backgroundColor: '#ccc' }]}
              onPress={handleSubmitSupport}
              disabled={isSubmittingSupport}
            >
              <Text style={styles.saveBtnText}>{isSubmittingSupport ? 'Sending...' : 'Send Message'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  name: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  email: { fontSize: 14, color: '#666' },
  phone: { fontSize: 14, color: '#666' },
  address: { fontSize: 13, color: '#999' },
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
  logoutContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: '#ED1C24' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 13, fontSize: 15, backgroundColor: '#fafafa', color: '#333' },
  saveBtn: { backgroundColor: '#ED1C24', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
