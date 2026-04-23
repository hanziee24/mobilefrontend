import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Bell, Bike, ChevronRight, DollarSign, Gauge, HelpCircle, KeyRound, LogOut, MapPin, Phone, Star, UserRound } from 'lucide-react-native';
import { authAPI, deliveryAPI, supportAPI } from '../services/api';

export default function RiderProfile() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    vehicle_type: '',
    vehicle_brand: '',
    license_number: '',
  });
  const [saving, setSaving] = useState(false);
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
      const [profileRes, statsRes] = await Promise.all([authAPI.getProfile(), deliveryAPI.getRiderStats()]);

      setUser(profileRes.data);
      setStats({
        totalDeliveries: statsRes.data.total_completed,
        totalEarnings: statsRes.data.total_earnings,
        todayEarnings: statsRes.data.today_earnings,
        weekEarnings: statsRes.data.week_earnings,
        averageRating: statsRes.data.average_rating,
        activeCount: statsRes.data.active_count,
      });
      setSupportName(`${profileRes.data.first_name || ''} ${profileRes.data.last_name || ''}`.trim());
      setSupportEmail(profileRes.data.email || '');
    } catch (_error) {
      console.log('Profile fetch error:', _error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      vehicle_type: user?.vehicle_type || '',
      vehicle_brand: user?.vehicle_brand || '',
      license_number: user?.license_number || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile(editForm);
      Alert.alert('Success', 'Profile updated successfully!');
      setEditModalVisible(false);
      fetchProfile();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
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
            <Bike size={38} color="#ED1C24" strokeWidth={2.2} />
          </View>
          <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
          <View style={styles.infoRow}>
            <Star size={14} color="#FF9800" strokeWidth={2.2} />
            <Text style={styles.rating}>{stats?.averageRating?.toFixed(1) || '0.0'} Rating</Text>
          </View>
          <View style={styles.infoRow}>
            <Phone size={14} color="#666" strokeWidth={2.2} />
            <Text style={styles.phone}>{user?.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Bike size={14} color="#666" strokeWidth={2.2} />
            <Text style={styles.vehicle}>{user?.vehicle_brand || user?.vehicle_type} | {user?.license_number}</Text>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={14} color="#999" strokeWidth={2.2} />
            <Text style={styles.address}>{user?.address}</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats?.totalDeliveries || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats?.activeCount || 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>PHP {stats?.totalEarnings?.toFixed(0) || 0}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
            <UserRound size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.menuText}>Edit Profile</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/performance-stats')}>
            <Gauge size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.menuText}>Performance Stats</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/earnings-tracker')}>
            <DollarSign size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.menuText}>Earnings History</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Bike size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.menuText}>Vehicle Details</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications')}>
            <Bell size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.menuText}>Notifications</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push({ pathname: '/mpin-setup', params: { userType: 'RIDER', userId: String(user?.id), isUpdate: 'true' } })}>
            <KeyRound size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.menuText}>Change MPIN</Text>
            <ChevronRight size={20} color="#bbb" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleOpenSupport}>
            <HelpCircle size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.menuText}>Help & Support</Text>
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

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>First Name</Text>
              <TextInput style={styles.input} value={editForm.first_name} onChangeText={(text) => setEditForm({ ...editForm, first_name: text })} />
              <Text style={styles.label}>Last Name</Text>
              <TextInput style={styles.input} value={editForm.last_name} onChangeText={(text) => setEditForm({ ...editForm, last_name: text })} />
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={editForm.phone} onChangeText={(text) => setEditForm({ ...editForm, phone: text })} keyboardType="phone-pad" />
              <Text style={styles.label}>Address</Text>
              <TextInput style={styles.input} value={editForm.address} onChangeText={(text) => setEditForm({ ...editForm, address: text })} multiline />
              <Text style={styles.label}>Vehicle Type</Text>
              <TextInput style={styles.input} value={editForm.vehicle_type} onChangeText={(text) => setEditForm({ ...editForm, vehicle_type: text })} />
              <Text style={styles.label}>Vehicle Brand/Model</Text>
              <TextInput style={styles.input} value={editForm.vehicle_brand} onChangeText={(text) => setEditForm({ ...editForm, vehicle_brand: text })} placeholder="e.g., Honda TMX 155, Toyota Vios" />
              <Text style={styles.label}>License Number</Text>
              <TextInput style={styles.input} value={editForm.license_number} onChangeText={(text) => setEditForm({ ...editForm, license_number: text })} />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setEditModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={supportVisible} animationType="slide" transparent onRequestClose={() => setSupportVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Help & Support</Text>
            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                value={supportName}
                onChangeText={setSupportName}
                placeholder="Full name"
                placeholderTextColor="#bbb"
                editable={!isSubmittingSupport}
              />
              <Text style={styles.label}>Email</Text>
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
              <Text style={styles.label}>Concern</Text>
              <TextInput
                style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                value={supportConcern}
                onChangeText={setSupportConcern}
                placeholder="Tell us how we can help..."
                placeholderTextColor="#bbb"
                multiline
                editable={!isSubmittingSupport}
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setSupportVisible(false)}
                disabled={isSubmittingSupport}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, isSubmittingSupport && { backgroundColor: '#ccc' }]}
                onPress={handleSubmitSupport}
                disabled={isSubmittingSupport}
              >
                <Text style={styles.saveButtonText}>{isSubmittingSupport ? 'Sending...' : 'Send Message'}</Text>
              </TouchableOpacity>
            </View>
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
  name: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  rating: { fontSize: 16, color: '#FF9800' },
  phone: { fontSize: 14, color: '#666' },
  vehicle: { fontSize: 14, color: '#666' },
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
  logoutInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: '#ED1C24' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalForm: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#ED1C24',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
