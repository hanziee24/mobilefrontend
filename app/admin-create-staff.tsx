import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

const ROLES = [
  { key: 'RIDER', icon: '🏍️', label: 'Rider' },
  { key: 'CASHIER', icon: '🧾', label: 'Cashier' },
];

export default function AdminCreateStaff() {
  const params = useLocalSearchParams();
  const [userType, setUserType] = useState<'RIDER' | 'CASHIER'>(
    (params.type as 'RIDER' | 'CASHIER') || 'RIDER'
  );
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const defaultDobValue = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  };

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() ||
        !address.trim() || !dobDate || !username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (userType === 'RIDER' && (!vehicleType.trim() || !vehicleBrand.trim() || !licenseNumber.trim())) {
      Alert.alert('Error', 'Vehicle information is required for riders');
      return;
    }

    Alert.alert(
      `Create ${userType.charAt(0) + userType.slice(1).toLowerCase()} Account`,
      `Create account for ${firstName} ${lastName}?\n\nUsername: ${username}\nThey can login immediately with these credentials.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create', onPress: submitCreate },
      ]
    );
  };

  const submitCreate = async () => {
    if (!dobDate) {
      Alert.alert('Error', 'Please select date of birth');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.createStaff({
        user_type: userType,
        username: username.trim(),
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        date_of_birth: formatDate(dobDate),
        ...(userType === 'RIDER' && {
          vehicle_type: vehicleType.trim(),
          vehicle_brand: vehicleBrand.trim(),
          license_number: licenseNumber.trim(),
        }),
      });
      Alert.alert(
        '✅ Account Created',
        `${userType.charAt(0) + userType.slice(1).toLowerCase()} account created successfully!\n\nUsername: ${res.data.username}\nEmail: ${res.data.email}\n\n📧 Login credentials have been sent to their email.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Failed to create account';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Staff Account</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Role selector */}
        <Text style={styles.sectionTitle}>Account Type</Text>
        <View style={styles.roleRow}>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r.key}
              style={[styles.roleBtn, userType === r.key && styles.roleBtnActive]}
              onPress={() => setUserType(r.key as 'RIDER' | 'CASHIER')}
            >
              <Text style={styles.roleIcon}>{r.icon}</Text>
              <Text style={[styles.roleLabel, userType === r.key && styles.roleLabelActive]}>{r.label}</Text>
              {userType === r.key && <View style={styles.roleCheck}><Text style={styles.roleCheckText}>✓</Text></View>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Personal Info */}
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor="#999" />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor="#999" />
            </View>
          </View>
          <Text style={styles.label}>Email *</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#999" />
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="09XXXXXXXXX" keyboardType="phone-pad" maxLength={11} placeholderTextColor="#999" />
          <Text style={styles.label}>Complete Address *</Text>
          <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={address} onChangeText={setAddress} placeholder="House no., Street, Barangay, City" multiline placeholderTextColor="#999" />
          <Text style={styles.label}>Date of Birth *</Text>
          <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDobPicker(true)}>
            <Text style={dobDate ? styles.datePickerText : styles.datePickerPlaceholder}>
              {dobDate ? formatDate(dobDate) : 'Select date of birth'}
            </Text>
          </TouchableOpacity>
          {showDobPicker && (
            <DateTimePicker
              value={dobDate || defaultDobValue()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, selectedDate) => {
                setShowDobPicker(Platform.OS === 'ios');
                if (selectedDate) setDobDate(selectedDate);
              }}
            />
          )}
        </View>

        {/* Rider-only fields */}
        {userType === 'RIDER' && (
          <>
            <Text style={styles.sectionTitle}>🏍️ Vehicle Information</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Vehicle Type *</Text>
              <TextInput style={styles.input} value={vehicleType} onChangeText={setVehicleType} placeholder="e.g. Motorcycle, Car" placeholderTextColor="#999" />
              <Text style={styles.label}>Vehicle Brand / Model *</Text>
              <TextInput style={styles.input} value={vehicleBrand} onChangeText={setVehicleBrand} placeholder="e.g. Honda TMX 155" placeholderTextColor="#999" />
              <Text style={styles.label}>License Number *</Text>
              <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} placeholder="Enter license number" autoCapitalize="characters" placeholderTextColor="#999" />
            </View>
          </>
        )}

        {/* Credentials */}
        <Text style={styles.sectionTitle}>Account Credentials</Text>
        <View style={styles.card}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>ℹ️ These credentials will be given to the staff member to login.</Text>
          </View>
          <Text style={styles.label}>Username *</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Enter username" autoCapitalize="none" placeholderTextColor="#999" />
          <Text style={styles.label}>Password *</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry={!showPassword}
              placeholderTextColor="#999"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, loading && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.createBtnText}>✅ Create {userType === 'RIDER' ? 'Rider' : 'Cashier'} Account</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15,
    backgroundColor: '#1a1a1a', borderBottomWidth: 3, borderBottomColor: '#ED1C24',
  },
  backBtn: { fontSize: 26, color: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 15 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 6 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  roleBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 18, borderRadius: 14,
    borderWidth: 2, borderColor: '#e0e0e0', backgroundColor: '#fff', position: 'relative',
  },
  roleBtnActive: { borderColor: '#ED1C24', backgroundColor: '#FFF0F0' },
  roleIcon: { fontSize: 30, marginBottom: 6 },
  roleLabel: { fontSize: 14, fontWeight: '600', color: '#666' },
  roleLabelActive: { color: '#ED1C24' },
  roleCheck: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#ED1C24', justifyContent: 'center', alignItems: 'center' },
  roleCheckText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  row: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#e8e8e8', padding: 13, borderRadius: 10, backgroundColor: '#fafafa', fontSize: 15, color: '#333' },
  datePickerBtn: { borderWidth: 1, borderColor: '#e8e8e8', padding: 13, borderRadius: 10, backgroundColor: '#fafafa' },
  datePickerText: { fontSize: 15, color: '#333' },
  datePickerPlaceholder: { fontSize: 15, color: '#999' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10, backgroundColor: '#fafafa' },
  passwordInput: { flex: 1, padding: 13, fontSize: 15, color: '#333' },
  eyeBtn: { padding: 13 },
  infoBox: { backgroundColor: '#E3F2FD', borderRadius: 10, padding: 12, marginBottom: 4 },
  infoText: { fontSize: 12, color: '#1565C0', lineHeight: 18 },
  createBtn: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  createBtnDisabled: { backgroundColor: '#ccc' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
