import { useEffect, useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Text, Modal, ActivityIndicator, Platform, Image, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Bike, BriefcaseBusiness, CircleUserRound, Package } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authAPI } from '../services/api';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

const SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>]/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter (a-z)', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number (0-9)', test: (value: string) => /[0-9]/.test(value) },
  { label: 'One special character (!@#$%^&*)', test: (value: string) => SPECIAL_CHAR_REGEX.test(value) },
];

export default function AuthScreen() {
  const params = useLocalSearchParams();
  const otpInputRef = useRef<TextInput>(null);

  const focusOtpInput = () => {
    requestAnimationFrame(() => otpInputRef.current?.focus());
  };

  const [isLogin, setIsLogin] = useState(params.mode !== 'register');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationUserRole, setVerificationUserRole] = useState<'CUSTOMER' | 'RIDER' | 'CASHIER' | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registerRole, setRegisterRole] = useState<'CUSTOMER' | 'RIDER' | 'CASHIER'>('CUSTOMER');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [identityImage, setIdentityImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [motorcycleRegistration, setMotorcycleRegistration] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [photoFront, setPhotoFront] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [photoLeft, setPhotoLeft] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [photoRight, setPhotoRight] = useState<{ uri: string; name: string; type: string } | null>(null);

  // Forgot password
  const [forgotStep, setForgotStep] = useState<0 | 1 | 2 | 3>(0); // 0=closed, 1=email, 2=verify, 3=new password
  const [fpEmail, setFpEmail] = useState('');
  const [fpCode, setFpCode] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpShowPassword, setFpShowPassword] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const fpOtpRef = useRef<TextInput>(null);

  const roleOptions = [
    { key: 'CUSTOMER', label: 'Customer', subLabel: 'Book and track deliveries', Icon: CircleUserRound },
    { key: 'RIDER', label: 'Rider', subLabel: 'Pickup and deliver parcels', Icon: Bike },
    { key: 'CASHIER', label: 'Cashier', subLabel: 'Manage branch parcel intake', Icon: BriefcaseBusiness },
  ] as const;

  useEffect(() => {
    if (isVerifying) {
      const timer = setTimeout(focusOtpInput, 250);
      return () => clearTimeout(timer);
    }
  }, [isVerifying]);

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getDobPickerValue = () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      const parsed = new Date(`${dateOfBirth.trim()}T00:00:00`);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() - 18);
    return fallback;
  };

  const validateDateOfBirth = (dob: string) => {
    if (!dob.trim()) return 'Date of birth is required';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) return 'Use format YYYY-MM-DD (e.g. 2000-01-25)';
    const birth = new Date(dob.trim());
    if (isNaN(birth.getTime())) return 'Enter a valid date';
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 18) return 'You must be at least 18 years old to register';
    if (age > 100) return 'Please enter a valid date of birth';
    return null;
  };

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number';
    if (!SPECIAL_CHAR_REGEX.test(pass)) return 'Password must contain at least one special character';
    return null;
  };

  const normalizePhoneNumber = (value: string) => {
    const compact = value.trim().replace(/[\s-]/g, '');
    if (/^09\d{9}$/.test(compact)) return compact;
    if (/^\+639\d{9}$/.test(compact)) return compact;
    if (/^639\d{9}$/.test(compact)) return `+${compact}`;
    return null;
  };

  const normalizeVehiclePlate = (value: string) => value.trim().toUpperCase().replace(/\s+/g, ' ');

  const isVehiclePlateFormatValid = (value: string) => {
    const compact = normalizeVehiclePlate(value).replace(/[\s-]/g, '');
    return /^[A-Z]{2,4}\d{3,4}$/.test(compact);
  };

  const normalizeLicenseNumber = (value: string) => value.trim().toUpperCase().replace(/\s+/g, ' ');

  const isLicenseNumberFormatValid = (value: string) => {
    const compact = normalizeLicenseNumber(value).replace(/[\s-]/g, '');
    return /^[A-Z0-9]{6,20}$/.test(compact);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.login(username, password);
      const type = res.data.user_type;
      const userId = res.data.user_id?.toString();
      if (type === 'ADMIN') router.replace('/admin-dashboard');
      else if (type === 'RIDER' || type === 'CASHIER') {
        const mpinSet = await AsyncStorage.getItem(`mpin_set_${userId}`);
        if (mpinSet === 'true') {
          router.replace({ pathname: '/mpin-verify', params: { userType: type, userId } } as any);
        } else {
          router.replace({ pathname: '/mpin-setup', params: { userType: type, userId } } as any);
        }
      } else {
        router.replace('/customer-dashboard');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.detail || error.message || 'Login failed';
      if (typeof msg === 'string' && msg.toLowerCase().includes('email not verified')) {
        setVerificationEmail(username.includes('@') ? username : '');
        setVerificationUserRole(null);
        setVerificationCode('');
        setIsVerifying(true);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const pickIdentityImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.uri.split('/').pop() || 'identity.jpg';
      const type = asset.mimeType || 'image/jpeg';
      setIdentityImage({ uri: asset.uri, name, type });
    }
  };

  const pickPhoto = async (setter: (v: { uri: string; name: string; type: string }) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setter({ uri: asset.uri, name: asset.uri.split('/').pop() || 'photo.jpg', type: asset.mimeType || 'image/jpeg' });
    }
  };

  const validateRegister = () => {
    if (!firstName.trim()) return 'First name is required';
    if (!/^[a-zA-Z\s'-]+$/.test(firstName.trim())) return 'First name must contain letters only';
    if (!lastName.trim()) return 'Last name is required';
    if (!/^[a-zA-Z\s'-]+$/.test(lastName.trim())) return 'Last name must contain letters only';
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address';
    if (!phone.trim()) return 'Phone number is required';
    if (!normalizePhoneNumber(phone)) return 'Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX)';
    if (!address.trim()) return 'Address is required';
    if (address.trim().length < 10) return 'Please enter a complete address';
    const dobErr = validateDateOfBirth(dateOfBirth);
    if (dobErr) return dobErr;
    if (registerRole === 'RIDER') {
      if (!vehicleBrand.trim()) return 'Vehicle brand is required for riders';
      if (!vehiclePlate.trim()) return 'Vehicle plate number is required for riders';
      if (!isVehiclePlateFormatValid(vehiclePlate)) return 'Enter a valid plate number (e.g. ABC 1234, ABC-1234, ABC1234)';
      if (!vehicleColor.trim()) return 'Vehicle color is required for riders';
      if (!licenseNumber.trim()) return 'License number is required for riders';
      if (!isLicenseNumberFormatValid(licenseNumber)) return 'Enter a valid license number (6-20 letters/numbers)';
      if (!identityImage) return 'Identity image is required for riders';
      if (!motorcycleRegistration) return 'Motorcycle registration document is required';
      if (!photoFront) return 'Front photo is required';
      if (!photoLeft) return 'Left side photo is required';
      if (!photoRight) return 'Right side photo is required';
    }
    if (!username.trim()) return 'Username is required';
    if (username.trim().length < 4) return 'Username must be at least 4 characters';
    if (!USERNAME_REGEX.test(username.trim())) return 'Username can only contain letters, numbers, and underscores';
    const pwErr = validatePassword(password);
    if (pwErr) return pwErr;
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const resetRegistrationForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setDateOfBirth('');
    setShowDobPicker(false);
    setRegisterRole('CUSTOMER');
    setVehicleBrand('');
    setVehiclePlate('');
    setVehicleColor('');
    setLicenseNumber('');
    setIdentityImage(null);
    setMotorcycleRegistration(null);
    setPhotoFront(null);
    setPhotoLeft(null);
    setPhotoRight(null);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const handleRegister = async () => {
    const err = validateRegister();
    if (err) {
      Alert.alert('Validation Error', err);
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phone) || phone.trim();
      const normalizedVehiclePlate = normalizeVehiclePlate(vehiclePlate);
      const normalizedLicense = normalizeLicenseNumber(licenseNumber);
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('phone', normalizedPhone);
      formData.append('address', address);
      formData.append('date_of_birth', dateOfBirth.trim());
      formData.append('user_type', registerRole);
      if (registerRole === 'RIDER') {
        formData.append('vehicle_brand', vehicleBrand.trim());
        formData.append('vehicle_plate', normalizedVehiclePlate);
        formData.append('vehicle_color', vehicleColor.trim());
        formData.append('license_number', normalizedLicense);
        if (identityImage) formData.append('identity_image', { uri: identityImage.uri, name: identityImage.name, type: identityImage.type } as any);
        if (motorcycleRegistration) formData.append('motorcycle_registration', { uri: motorcycleRegistration.uri, name: motorcycleRegistration.name, type: motorcycleRegistration.type } as any);
        if (photoFront) formData.append('photo_front', { uri: photoFront.uri, name: photoFront.name, type: photoFront.type } as any);
        if (photoLeft) formData.append('photo_left', { uri: photoLeft.uri, name: photoLeft.name, type: photoLeft.type } as any);
        if (photoRight) formData.append('photo_right', { uri: photoRight.uri, name: photoRight.name, type: photoRight.type } as any);
      }

      const response = await authAPI.register(formData);
      if (response.status === 200 || response.status === 201) {
        setVerificationEmail(email);
        setVerificationUserRole(registerRole);
        setVerificationCode('');
        setIsVerifying(true);
        resetRegistrationForm();
      } else {
        Alert.alert('Error', 'Registration failed. Please try again.');
      }
    } catch (error: any) {
      const d = error.response?.data;
      const firstFieldError =
        d?.username?.[0] ||
        d?.email?.[0] ||
        d?.password?.[0] ||
        d?.phone?.[0];
      const firstObjectError =
        d && typeof d === 'object'
          ? Object.values(d).flat().find((value) => typeof value === 'string')
          : null;
      const msg =
        firstFieldError ||
        d?.error ||
        d?.detail ||
        (typeof d === 'string' ? d : null) ||
        firstObjectError ||
        error.message ||
        'Registration failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      await authAPI.verifyEmail(verificationEmail, verificationCode);
      setIsVerifying(false);
      setIsLogin(true);
      resetRegistrationForm();
      setVerificationEmail('');
      setVerificationUserRole(null);
      setVerificationCode('');
      const msg = verificationUserRole === 'RIDER' || verificationUserRole === 'CASHIER'
        ? 'Your email has been verified. Your application is pending admin approval.'
        : 'Your email has been verified. You can now sign in.';
      Alert.alert('Verified', msg);
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Verification failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fpEmail.trim())) {
      Alert.alert('Error', 'Enter a valid email address');
      return;
    }
    setFpLoading(true);
    try {
      await authAPI.forgotPasswordRequest(fpEmail.trim());
      setFpStep(2);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to send code');
    } finally {
      setFpLoading(false);
    }
  };

  const setFpStep = (step: 0 | 1 | 2 | 3) => {
    setForgotStep(step);
    if (step === 2) requestAnimationFrame(() => fpOtpRef.current?.focus());
  };

  const handleForgotVerify = async () => {
    if (fpCode.length !== 6) {
      Alert.alert('Error', 'Enter the 6-digit code');
      return;
    }
    setFpLoading(true);
    try {
      await authAPI.forgotPasswordVerify(fpEmail.trim(), fpCode);
      setFpStep(3);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message || 'Invalid code');
    } finally {
      setFpLoading(false);
    }
  };

  const handleForgotReset = async () => {
    const pwErr = validatePassword(fpNewPassword);
    if (pwErr) { Alert.alert('Error', pwErr); return; }
    setFpLoading(true);
    try {
      await authAPI.forgotPasswordReset(fpEmail.trim(), fpCode, fpNewPassword);
      Alert.alert('Success', 'Password reset successfully. You can now sign in.');
      setFpStep(0);
      setFpEmail('');
      setFpCode('');
      setFpNewPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message || 'Reset failed');
    } finally {
      setFpLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!verificationEmail) {
      Alert.alert('Error', 'No email address found');
      return;
    }

    setResendLoading(true);
    try {
      await authAPI.resendVerification(verificationEmail);
      Alert.alert('Sent', 'A new verification code has been sent to your email.');
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Failed to resend code';
      Alert.alert('Error', msg);
    } finally {
      setResendLoading(false);
    }
  };

  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    label: rule.label,
    ok: rule.test(password),
  }));

  return (
    <SafeAreaView style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#8F0A14" />

      <LinearGradient colors={['#7E0A13', '#A30F1A', '#C61825']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.topSection}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/explore')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>JTE</Text>
            </View>
            <View>
              <Text style={styles.brandName}>JRNZ Tracking Express</Text>
              <Text style={styles.brandSub}>Speed and reliability</Text>
            </View>
          </View>

          <View style={styles.headlineBlock}>
            <Text style={styles.headline}>{isLogin ? 'Welcome back!' : 'Create your account'}</Text>
            <Text style={styles.headlineSub}>{isLogin ? 'Sign in to continue tracking your deliveries.' : 'Join our network for seamless parcel management.'}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.bottomCard} showsVerticalScrollIndicator={false} contentContainerStyle={styles.bottomContent}>
        {/* Forgot Password Modal */}
        <Modal visible={forgotStep > 0} transparent animationType="fade" onRequestClose={() => setFpStep(0)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* Step indicators */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
                {[1, 2, 3].map((s) => (
                  <View key={s} style={[
                    { flex: 1, height: 4, borderRadius: 2, backgroundColor: forgotStep >= s ? '#ED1C24' : '#e0e0e0' }
                  ]} />
                ))}
              </View>

              {forgotStep === 1 && (
                <>
                  <Ionicons name="lock-open-outline" size={46} color="#ED1C24" style={styles.modalIcon} />
                  <Text style={styles.modalTitle}>Forgot Password</Text>
                  <Text style={styles.modalSubtitle}>Enter your registered email and we will send a verification code.</Text>
                  <View style={[styles.inputWrap, { width: '100%', marginBottom: 18 }]}>
                    <Ionicons name="mail-outline" size={18} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="email@example.com"
                      value={fpEmail}
                      onChangeText={setFpEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholderTextColor="#999"
                    />
                  </View>
                  <TouchableOpacity style={[styles.modalBtn, fpLoading && styles.disabledBtn]} onPress={handleForgotRequest} disabled={fpLoading}>
                    {fpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Send Code</Text>}
                  </TouchableOpacity>
                </>
              )}

              {forgotStep === 2 && (
                <>
                  <Ionicons name="mail-open-outline" size={46} color="#ED1C24" style={styles.modalIcon} />
                  <Text style={styles.modalTitle}>Verify Code</Text>
                  <Text style={styles.modalSubtitle}>We sent a 6-digit code to{`\n`}<Text style={styles.modalEmail}>{fpEmail}</Text></Text>
                  <TouchableOpacity style={styles.otpTouchLayer} activeOpacity={1} onPress={() => fpOtpRef.current?.focus()}>
                    <View style={styles.otpRow}>
                      {Array.from({ length: 6 }).map((_, idx) => {
                        const char = fpCode[idx] || '';
                        const active = fpCode.length === idx;
                        return (
                          <View key={idx} style={[styles.otpCell, (char || active) && styles.otpCellActive]}>
                            <Text style={styles.otpCellText}>{char}</Text>
                          </View>
                        );
                      })}
                    </View>
                    <TextInput
                      ref={fpOtpRef}
                      style={styles.otpHiddenInput}
                      value={fpCode}
                      onChangeText={(v) => setFpCode(v.replace(/\D/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                      caretHidden
                      showSoftInputOnFocus
                      contextMenuHidden
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, fpLoading && styles.disabledBtn]} onPress={handleForgotVerify} disabled={fpLoading}>
                    {fpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Verify Code</Text>}
                  </TouchableOpacity>
                </>
              )}

              {forgotStep === 3 && (
                <>
                  <Ionicons name="shield-checkmark-outline" size={46} color="#ED1C24" style={styles.modalIcon} />
                  <Text style={styles.modalTitle}>New Password</Text>
                  <Text style={styles.modalSubtitle}>Create a strong new password for your account.</Text>
                  <View style={[styles.passwordRow, { width: '100%', marginBottom: 14 }]}>
                    <Ionicons name="lock-closed-outline" size={18} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="New password"
                      value={fpNewPassword}
                      onChangeText={setFpNewPassword}
                      secureTextEntry={!fpShowPassword}
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity onPress={() => setFpShowPassword(!fpShowPassword)} style={styles.eyeBtn}>
                      <Ionicons name={fpShowPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#888" />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.hintsList, { width: '100%', marginBottom: 18 }]}>
                    {PASSWORD_RULES.map((rule) => (
                      <View key={rule.label} style={styles.hintRow}>
                        <Ionicons name={rule.test(fpNewPassword) ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={rule.test(fpNewPassword) ? '#2e7d32' : '#b0b0b0'} />
                        <Text style={[styles.hintText, rule.test(fpNewPassword) && styles.hintTextOk]}>{rule.label}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity style={[styles.modalBtn, fpLoading && styles.disabledBtn]} onPress={handleForgotReset} disabled={fpLoading}>
                    {fpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Reset Password</Text>}
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity onPress={() => setFpStep(0)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={isVerifying} transparent animationType="fade" onShow={focusOtpInput} onRequestClose={() => setIsVerifying(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Ionicons name="mail-open-outline" size={46} color="#ED1C24" style={styles.modalIcon} />
              <Text style={styles.modalTitle}>Verify Your Email</Text>
              <Text style={styles.modalSubtitle}>
                We sent a 6-digit code to{`\n`}
                <Text style={styles.modalEmail}>{verificationEmail}</Text>
              </Text>

              <TouchableOpacity style={styles.otpTouchLayer} activeOpacity={1} onPress={() => otpInputRef.current?.focus()}>
                <View style={styles.otpRow}>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const char = verificationCode[idx] || '';
                    const active = verificationCode.length === idx;
                    return (
                      <View key={idx} style={[styles.otpCell, (char || active) && styles.otpCellActive]}>
                        <Text style={styles.otpCellText}>{char}</Text>
                      </View>
                    );
                  })}
                </View>
                <TextInput
                  ref={otpInputRef}
                  style={styles.otpHiddenInput}
                  value={verificationCode}
                  onChangeText={(value) => setVerificationCode(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  caretHidden
                  showSoftInputOnFocus
                  contextMenuHidden
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalBtn, loading && styles.disabledBtn]} onPress={handleVerifyEmail} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Verify Email</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalResendBtn, resendLoading && styles.disabledBtn]} onPress={handleResendCode} disabled={resendLoading}>
                <Text style={styles.modalResendText}>{resendLoading ? 'Sending...' : "Didn't receive it? Resend Code"}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsVerifying(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, isLogin && styles.tabActive]} onPress={() => setIsLogin(true)}>
            <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, !isLogin && styles.tabActive]} onPress={() => setIsLogin(false)}>
            <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Register</Text>
          </TouchableOpacity>
        </View>

        {!isLogin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Text style={styles.label}>Register As *</Text>
            <Text style={styles.roleHelperText}>Choose your account role carefully before creating your account.</Text>

            <View style={styles.roleGrid}>
              {roleOptions.map((role) => (
                <TouchableOpacity
                  key={role.key}
                  style={[styles.roleCard, registerRole === role.key && styles.roleCardActive]}
                  onPress={() => setRegisterRole(role.key)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.roleStripe, registerRole === role.key && styles.roleStripeActive]} />
                  <View style={styles.roleCardLeft}>
                    <View style={[styles.roleIconWrap, registerRole === role.key && styles.roleIconWrapActive]}>
                      <role.Icon size={20} color={registerRole === role.key ? '#ED1C24' : '#666'} strokeWidth={2.3} />
                    </View>
                    <View style={styles.roleTextWrap}>
                      <Text style={[styles.roleLabel, registerRole === role.key && styles.roleLabelActive]}>{role.label}</Text>
                      <Text style={styles.roleSubLabel}>{role.subLabel}</Text>
                    </View>
                  </View>
                  {registerRole === role.key && (
                    <View style={styles.roleCheck}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>First Name *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color="#888" style={styles.inputIcon} />
                  <TextInput style={styles.inputWithIcon} placeholder="First name" value={firstName} onChangeText={setFirstName} placeholderTextColor="#999" />
                </View>
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Last Name *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color="#888" style={styles.inputIcon} />
                  <TextInput style={styles.inputWithIcon} placeholder="Last name" value={lastName} onChangeText={setLastName} placeholderTextColor="#999" />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Email *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#888" style={styles.inputIcon} />
              <TextInput style={styles.inputWithIcon} placeholder="email@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#999" />
            </View>

            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="call-outline" size={18} color="#888" style={styles.inputIcon} />
              <TextInput style={styles.inputWithIcon} placeholder="09XXXXXXXXX or +639XXXXXXXXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#999" />
            </View>

            <Text style={styles.label}>Complete Address *</Text>
            <View style={[styles.inputWrap, styles.textAreaWrap]}>
              <Ionicons name="location-outline" size={18} color="#888" style={styles.inputIconTop} />
              <TextInput style={[styles.inputWithIcon, styles.textArea]} placeholder="House no., Street, Barangay, City" value={address} onChangeText={setAddress} multiline numberOfLines={3} placeholderTextColor="#999" />
            </View>

            <Text style={styles.label}>Date of Birth *</Text>
            <TouchableOpacity style={styles.inputWrap} onPress={() => setShowDobPicker(true)}>
              <Ionicons name="calendar-outline" size={18} color="#888" style={styles.inputIcon} />
              <Text style={dateOfBirth ? styles.datePickerText : styles.datePickerPlaceholder}>{dateOfBirth || 'Select date of birth'}</Text>
            </TouchableOpacity>

            {showDobPicker && (
              <DateTimePicker
                value={getDobPickerValue()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_, selectedDate) => {
                  setShowDobPicker(Platform.OS === 'ios');
                  if (selectedDate) setDateOfBirth(formatDate(selectedDate));
                }}
              />
            )}
            <Text style={styles.dobHint}>Must be 18 years old or above</Text>

            {registerRole === 'RIDER' && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Rider Information</Text>

                <Text style={styles.label}>Vehicle Brand *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="bicycle-outline" size={18} color="#888" style={styles.inputIcon} />
                  <TextInput style={styles.inputWithIcon} placeholder="e.g. Honda, Yamaha, Kawasaki" value={vehicleBrand} onChangeText={setVehicleBrand} placeholderTextColor="#999" />
                </View>

                <Text style={styles.label}>Vehicle Plate Number *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="document-text-outline" size={18} color="#888" style={styles.inputIcon} />
                  <TextInput style={styles.inputWithIcon} placeholder="e.g. ABC 1234, ABC-1234" value={vehiclePlate} onChangeText={setVehiclePlate} autoCapitalize="characters" placeholderTextColor="#999" />
                </View>

                <Text style={styles.label}>Vehicle Color *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="color-palette-outline" size={18} color="#888" style={styles.inputIcon} />
                  <TextInput style={styles.inputWithIcon} placeholder="e.g. Red, Black" value={vehicleColor} onChangeText={setVehicleColor} placeholderTextColor="#999" />
                </View>

                <Text style={styles.label}>License Number *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="card-outline" size={18} color="#888" style={styles.inputIcon} />
                  <TextInput style={styles.inputWithIcon} placeholder="e.g. N01-23-123456 or D1234567" value={licenseNumber} onChangeText={setLicenseNumber} autoCapitalize="characters" placeholderTextColor="#999" />
                </View>

                <Text style={styles.label}>Identity Image (ID/License) *</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickIdentityImage}>
                  {identityImage ? (
                    <Image source={{ uri: identityImage.uri }} style={styles.identityPreview} />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="camera-outline" size={28} color="#888" />
                      <Text style={styles.imagePickerText}>Tap to upload ID / License photo</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.label}>Motorcycle Registration *</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={() => pickPhoto(setMotorcycleRegistration)}>
                  {motorcycleRegistration ? (
                    <Image source={{ uri: motorcycleRegistration.uri }} style={styles.identityPreview} />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="document-outline" size={28} color="#888" />
                      <Text style={styles.imagePickerText}>Tap to upload motorcycle registration</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Photo Verification</Text>
                <Text style={styles.roleHelperText}>Upload 3 clear photos of yourself to verify your identity.</Text>

                {([{ label: 'Front View *', key: 'front', state: photoFront, setter: setPhotoFront },
                   { label: 'Left Side View *', key: 'left', state: photoLeft, setter: setPhotoLeft },
                   { label: 'Right Side View *', key: 'right', state: photoRight, setter: setPhotoRight }] as const).map(item => (
                  <View key={item.key}>
                    <Text style={styles.label}>{item.label}</Text>
                    <TouchableOpacity style={styles.imagePicker} onPress={() => pickPhoto(item.setter)}>
                      {item.state ? (
                        <Image source={{ uri: item.state.uri }} style={styles.identityPreview} />
                      ) : (
                        <View style={styles.imagePickerPlaceholder}>
                          <Ionicons name="person-outline" size={28} color="#888" />
                          <Text style={styles.imagePickerText}>Tap to upload {item.label.replace(' *', '')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isLogin ? 'Account' : 'Account Credentials'}</Text>

          <Text style={styles.label}>Username *</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="at-outline" size={18} color="#888" style={styles.inputIcon} />
            <TextInput style={styles.inputWithIcon} placeholder="Enter username" value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor="#999" />
          </View>

          <Text style={styles.label}>Password *</Text>
          <View style={styles.passwordRow}>
            <Ionicons name="lock-closed-outline" size={18} color="#888" style={styles.inputIcon} />
            <TextInput style={styles.passwordInput} placeholder="Enter password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholderTextColor="#999" />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#888" />
            </TouchableOpacity>
          </View>

          {isLogin && (
            <TouchableOpacity onPress={() => { setFpEmail(''); setFpCode(''); setFpNewPassword(''); setForgotStep(1); }} style={{ alignSelf: 'flex-end', marginTop: 6, marginBottom: 2 }}>
              <Text style={{ color: '#ED1C24', fontSize: 13, fontWeight: '600' }}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {!isLogin && (
            <>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.passwordRow}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#888" style={styles.inputIcon} />
                <TextInput style={styles.passwordInput} placeholder="Re-enter password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholderTextColor="#999" />
              </View>

              <View style={styles.hintsList}>
                {passwordChecks.map((item) => (
                  <View key={item.label} style={styles.hintRow}>
                    <Ionicons
                      name={item.ok ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={item.ok ? '#2e7d32' : '#b0b0b0'}
                    />
                    <Text style={[styles.hintText, item.ok && styles.hintTextOk]}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <TouchableOpacity style={[styles.submitBtn, loading && styles.disabledBtn]} onPress={isLogin ? handleLogin : handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.submitBtnInner}>
              <Text style={styles.submitBtnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.guestSection}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={() => router.push('/guest-tracking')} style={styles.guestCard}>
            <View style={styles.guestCardLeft}>
              <Package size={18} color="#fff" strokeWidth={2.4} />
            </View>
            <View style={styles.guestCardBody}>
              <Text style={styles.guestCardTitle}>Track a Package</Text>
              <Text style={styles.guestCardSub}>No account needed - enter your tracking number</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ED1C24" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footerWrapper}>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Your data is safe and encrypted</Text>
          <Text style={styles.footerSub}>JRNZ Tracking Express (c) 2025</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f5f5f5' },
  topSection: { paddingTop: 20, paddingBottom: 70, overflow: 'hidden' },
  circle1: { position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' },
  circle2: { position: 'absolute', bottom: 30, left: -50, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' },
  circle3: { position: 'absolute', top: 50, left: 20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.04)' },
  header: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 30 },
  backButton: { position: 'absolute', top: 47, left: 18, zIndex: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  logoBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  logoText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  brandName: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 2 },
  brandSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  headlineBlock: { alignItems: 'center', marginBottom: 20 },
  headline: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },
  headlineSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },

  bottomCard: { flex: 1, marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#f5f5f5', overflow: 'hidden' },
  bottomContent: { padding: 20, paddingBottom: 100 },

  brandBadge: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 14,
  },
  brandBadgeText: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 1.4 },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  formContainer: { backgroundColor: '#fff' },

  tabRow: { flexDirection: 'row', backgroundColor: '#ebebeb', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 10, position: 'relative' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  tabText: { fontSize: 15, fontWeight: '700', color: '#8c8c8c' },
  tabTextActive: { color: '#ED1C24' },
  tabUnderline: { position: 'absolute', bottom: 5, width: 34, height: 3, borderRadius: 2, backgroundColor: '#ED1C24' },

  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#F8A8AC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 7,
    elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#ED1C24', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },

  roleHelperText: { fontSize: 12, color: '#888', marginBottom: 10 },
  roleGrid: { gap: 10 },
  roleCard: { minHeight: 68, borderRadius: 12, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fbfbfb', position: 'relative', paddingVertical: 12, paddingHorizontal: 12, justifyContent: 'center' },
  roleCardActive: { borderColor: '#ED1C24', backgroundColor: '#FFF3F4' },
  roleStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, backgroundColor: 'transparent' },
  roleStripeActive: { backgroundColor: '#ED1C24' },
  roleCardLeft: { flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  roleIconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eeeeee', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  roleIconWrapActive: { backgroundColor: '#FFE4E6' },
  roleTextWrap: { flex: 1, paddingRight: 22 },
  roleLabel: { fontSize: 14, fontWeight: '700', color: '#444' },
  roleLabelActive: { color: '#ED1C24' },
  roleSubLabel: { fontSize: 12, color: '#777', marginTop: 1 },
  roleCheck: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#ED1C24', justifyContent: 'center', alignItems: 'center' },

  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 10 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10, backgroundColor: '#fafafa', minHeight: 48, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  inputIconTop: { marginRight: 8, marginTop: 12, alignSelf: 'flex-start' },
  inputWithIcon: { flex: 1, fontSize: 15, color: '#333', paddingVertical: 12 },
  textAreaWrap: { alignItems: 'flex-start' },
  textArea: { height: 84, textAlignVertical: 'top', paddingTop: 10 },
  datePickerText: { fontSize: 15, color: '#333', flex: 1, paddingVertical: 12 },
  datePickerPlaceholder: { fontSize: 15, color: '#999', flex: 1, paddingVertical: 12 },

  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10, backgroundColor: '#fafafa', minHeight: 48, paddingHorizontal: 12 },
  passwordInput: { flex: 1, fontSize: 15, color: '#333', paddingVertical: 12 },
  eyeBtn: { paddingHorizontal: 6, paddingVertical: 6 },

  hintsList: { marginTop: 12, gap: 8 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hintText: { fontSize: 12, color: '#8a8a8a' },
  hintTextOk: { color: '#2e7d32', fontWeight: '600' },

  dobHint: { fontSize: 11, color: '#999', fontStyle: 'italic', marginTop: 6 },

  submitBtn: {
    width: '100%',
    backgroundColor: '#ED1C24',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 6,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#ED1C24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  submitBtnInner: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  disabledBtn: { opacity: 0.6 },

  guestSection: { marginTop: 4, marginBottom: 0 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e8e8e8' },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: '#aaa', fontWeight: '600' },
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F2',
    borderWidth: 1.5,
    borderColor: '#ED1C24',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowColor: '#ED1C24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  guestCardLeft: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ED1C24', justifyContent: 'center', alignItems: 'center' },
  guestCardBody: { flex: 1 },
  guestCardTitle: { fontSize: 15, fontWeight: '700', color: '#ED1C24', marginBottom: 2 },
  guestCardSub: { fontSize: 12, color: '#666' },

  footerWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  footer: { backgroundColor: '#f5f5f5', borderTopWidth: 1, borderTopColor: '#e8e8e8', alignItems: 'center', paddingVertical: 14, gap: 4 },
  footerText: { fontSize: 12, color: '#888', fontWeight: '500' },
  footerSub: { fontSize: 11, color: '#bbb' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, width: '100%', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
  modalIcon: { marginBottom: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  modalEmail: { fontWeight: '700', color: '#ED1C24' },
  otpTouchLayer: { width: '100%', marginBottom: 18 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpCell: { flex: 1, minHeight: 50, borderWidth: 1.5, borderColor: '#e4e4e4', borderRadius: 10, backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center' },
  otpCellActive: { borderColor: '#ED1C24', backgroundColor: '#fff5f5' },
  otpCellText: { fontSize: 22, fontWeight: '700', color: '#333' },
  otpHiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 },
  modalBtn: { backgroundColor: '#ED1C24', padding: 15, borderRadius: 12, alignItems: 'center', width: '100%', marginBottom: 12 },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalResendBtn: { paddingVertical: 10, width: '100%', alignItems: 'center' },
  modalResendText: { color: '#ED1C24', fontWeight: '600', fontSize: 14 },
  modalCancelBtn: { paddingVertical: 10 },
  modalCancelText: { color: '#999', fontSize: 13 },

  branchItem: { paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  branchItemText: { fontSize: 15, color: '#333', fontWeight: '600' },
  branchItemActive: { color: '#ED1C24' },
  branchItemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  imagePicker: { borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 10, overflow: 'hidden', minHeight: 120, backgroundColor: '#fafafa', marginTop: 4 },
  identityPreview: { width: '100%', height: 160, resizeMode: 'cover' },
  imagePickerPlaceholder: { flex: 1, minHeight: 120, justifyContent: 'center', alignItems: 'center', gap: 8 },
  imagePickerText: { fontSize: 13, color: '#888', textAlign: 'center' },
});
