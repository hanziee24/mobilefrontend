import { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  TextInput,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supportAPI, trackingAPI } from '../../services/api';
import { AlertCircle, Bike, Check, Clock3, MapPin, MessageCircle, PackageCheck, Search, Truck, X } from 'lucide-react-native';

const TRACK_STEPS = [
  { key: 'PENDING', label: 'Pending', icon: Clock3 },
  { key: 'PICKED_UP', label: 'Picked Up', icon: PackageCheck },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Check },
];
const STATUS_ORDER: Record<string, number> = {
  PENDING: 0, PICKED_UP: 1, IN_TRANSIT: 1, OUT_FOR_DELIVERY: 2, DELIVERED: 3,
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending', PICKED_UP: 'Picked Up', IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery', DELIVERED: 'Delivered',
  FAILED: 'Delivery Failed', CANCELLED: 'Cancelled',
};

const STEPS = [
  {
    step: '1',
    label: 'Submit Delivery Request',
    owner: 'Customer',
    desc: 'Sign in, fill in sender and receiver details, then submit your booking. A cashier at the branch reviews and processes it.',
    outcome: 'Cashier accepts the request and creates the delivery record.',
  },
  {
    step: '2',
    label: 'Approve and Assign Rider',
    owner: 'Admin',
    desc: 'Admin reviews the delivery and approves it. The system auto-assigns the nearest available online rider based on delivery zone.',
    outcome: 'Assigned rider is notified instantly with pickup details.',
  },
  {
    step: '3',
    label: 'Pickup and Live Updates',
    owner: 'Rider',
    desc: 'Rider picks up the package and updates the status at each stage while traveling to the destination.',
    outcome: 'Customer receives real-time notifications at every status change.',
  },
  {
    step: '4',
    label: 'Deliver and Complete',
    owner: 'Rider',
    desc: 'Rider confirms drop-off, uploads proof of delivery, and marks the delivery as complete.',
    outcome: "Delivery fee is credited to the rider's wallet. Customer can rate the rider.",
  },
];

const ASSIGNMENTS = [
  { role: 'Customer', task: 'Book deliveries, track status, and receive updates.' },
  { role: 'Admin', task: 'Review requests, assign riders, and monitor operations.' },
  { role: 'Rider', task: 'Pickup packages, update status, and complete drop-offs.' },
  { role: 'Cashier', task: 'Process POS and payment records when needed.' },
];

const TRUST = ['Secure Payments', 'GPS Verified', 'Fast Delivery'];
const FEATURES = [
  { label: 'GPS Tracking', icon: MapPin },
  { label: 'POS Payments', icon: PackageCheck },
  { label: 'Live Alerts', icon: MessageCircle },
];

export default function LandingScreen() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [chatVisible, setChatVisible] = useState(false);

  const handleTrack = async () => {
    const trimmed = trackingNumber.trim();
    if (!trimmed) return;
    setTrackLoading(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const res = await trackingAPI.trackByNumber(trimmed);
      setTrackResult(res.data);
    } catch (e: any) {
      setTrackError(e.response?.data?.error || 'Tracking number not found.');
    } finally {
      setTrackLoading(false);
    }
  };
  const [isSubmittingConcern, setIsSubmittingConcern] = useState(false);
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportConcern, setSupportConcern] = useState('');
  const [supportFeedback, setSupportFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | ''>('');

  const parseConcernType = (concern: string): 'GENERAL' | 'RIDER_APPLICATION' | 'CASHIER_APPLICATION' => {
    const text = concern.toLowerCase();
    if (text.includes('rider')) return 'RIDER_APPLICATION';
    if (text.includes('cashier')) return 'CASHIER_APPLICATION';
    return 'GENERAL';
  };

  const submitSupportMessage = async () => {
    if (isSubmittingConcern) return;

    const name = supportName.trim();
    const email = supportEmail.trim().toLowerCase();
    const concern = supportConcern.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (name.length < 2) {
      setFeedbackType('error');
      setSupportFeedback('Please enter your full name.');
      return;
    }

    if (!emailRegex.test(email)) {
      setFeedbackType('error');
      setSupportFeedback('Please enter a valid email address.');
      return;
    }

    if (concern.length < 10) {
      setFeedbackType('error');
      setSupportFeedback('Please provide more details in your message.');
      return;
    }

    setIsSubmittingConcern(true);
    setFeedbackType('');
    setSupportFeedback('');

    try {
      await supportAPI.createTicket({
        name,
        email,
        concern,
        concern_type: parseConcernType(concern),
      });
      setFeedbackType('success');
      setSupportFeedback('Message sent successfully. Staff will review your concern.');
      setSupportConcern('');
    } catch (error: any) {
      const detail = error?.response?.data?.error || 'Failed to submit your concern. Please try again.';
      setFeedbackType('error');
      setSupportFeedback(detail);
    } finally {
      setIsSubmittingConcern(false);
    }
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#8F0A14" />

      <LinearGradient colors={['#7E0A13', '#A30F1A', '#C61825']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.topSection}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>JTE</Text>
            </View>
            <View>
              <Text style={styles.brandName}>JRNZ Tracking Express</Text>
              <Text style={styles.brandSub}>Inspired by J&T speed and reliability</Text>
            </View>
          </View>
        </View>

        <View style={styles.headlineBlock}>
          <Text style={styles.headline}>Express Lane{"\n"}For Every Parcel.</Text>
          <Text style={styles.headlineSub}>Red-zone logistics, live status sync, and transparent delivery confidence.</Text>
        </View>

        <View style={styles.trustStrip}>
          {TRUST.map((t, i) => (
            <View key={i} style={styles.trustItem}>
              <Text style={styles.trustText}>{t}</Text>
              {i < TRUST.length - 1 && <View style={styles.trustDivider} />}
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={styles.bottomCard} showsVerticalScrollIndicator={false} contentContainerStyle={styles.bottomContent}>
        <LinearGradient
          colors={['#FFFFFF', '#FFF9F9', '#FFFDFD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.liquidCard}
        >
          <View style={styles.liquidGlow} />
          <Text style={styles.trackLabel}>Track your package</Text>
          <Text style={styles.trackHint}>Use your parcel ID to see its live route, rider assignment, and delivery stage.</Text>
          <View style={styles.trackRow}>
            <TextInput
              style={styles.trackInput}
              placeholder="Enter tracking number..."
              value={trackingNumber}
              onChangeText={(v) => { setTrackingNumber(v); setTrackError(''); setTrackResult(null); }}
              placeholderTextColor="#9e9e9e"
              autoCapitalize="characters"
              onSubmitEditing={handleTrack}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.trackBtn, (!trackingNumber || trackLoading) && styles.trackBtnDisabled]}
              onPress={handleTrack}
              disabled={!trackingNumber || trackLoading}
            >
              {trackLoading ? <ActivityIndicator color="#fff" size="small" /> : <Search size={18} color="#fff" strokeWidth={2.4} />}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {!!trackError && (
          <View style={styles.trackErrorBox}>
            <View style={styles.trackErrorRow}>
              <View style={styles.trackErrorIconWrap}>
                <AlertCircle size={13} color="#9A1420" strokeWidth={2.2} />
              </View>
              <Text style={styles.trackErrorText}>{trackError}</Text>
            </View>
          </View>
        )}

        {!!trackResult && (
          <View style={styles.trackResultCard}>
            <Text style={styles.trackResultNum}>{trackResult.tracking_number}</Text>
            <Text style={styles.trackResultStatus}>{STATUS_LABEL[trackResult.status] || trackResult.status}</Text>
            <View style={styles.trackTimeline}>
              {TRACK_STEPS.map((step, i) => {
                const done = i <= (STATUS_ORDER[trackResult.status] ?? -1);
                return (
                  <View key={step.key} style={styles.trackStepWrap}>
                    {i > 0 && <View style={[styles.trackLine, done && styles.trackLineDone]} />}
                    <View style={[styles.trackDot, done && styles.trackDotDone]}>
                      <step.icon size={12} color={done ? '#fff' : '#888'} strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.trackStepLabel, done && styles.trackStepLabelDone]}>{step.label}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.trackAddressRow}>
              <View style={styles.trackAddressIconWrap}>
                <MapPin size={15} color="#2e7d32" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trackAddressLabel}>Pickup</Text>
                <Text style={styles.trackAddressValue}>{trackResult.pickup_address?.split('|')[0] || 'N/A'}</Text>
              </View>
            </View>
            <View style={[styles.trackAddressRow, { marginTop: 8 }]}>
              <View style={styles.trackAddressIconWrap}>
                <MapPin size={15} color="#9A1420" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trackAddressLabel}>Delivery</Text>
                <Text style={styles.trackAddressValue}>{trackResult.delivery_address?.split('|')[0] || 'N/A'}</Text>
              </View>
            </View>
            {trackResult.rider_name && (
              <View style={styles.trackRiderRow}>
                <View style={styles.trackRiderInner}>
                  <Bike size={13} color="#333" strokeWidth={2.2} />
                  <Text style={styles.trackRiderText}>Rider: {trackResult.rider_name}</Text>
                </View>
              </View>
            )}
            {(trackResult.status === 'FAILED' || trackResult.status === 'CANCELLED') && (
              <View style={styles.trackExceptionRow}>
                <Text style={styles.trackExceptionText}>
                  {trackResult.status === 'FAILED'
                    ? `Delivery failed${trackResult.failure_reason ? `: ${trackResult.failure_reason}` : ''}`
                    : 'Delivery has been cancelled.'}
                </Text>
              </View>
            )}
            <Text style={styles.trackUpdated}>Last updated: {new Date(trackResult.updated_at).toLocaleString()}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>How it works</Text>
        <Text style={styles.sectionSubtitle}>Clear assignments so each user knows their exact responsibility.</Text>

        <View style={styles.stepsColumn}>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.stepCard}>
              <View style={styles.stepHeaderRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{s.step}</Text>
                </View>
                <View style={styles.stepHeaderCopy}>
                  <Text style={styles.stepLabel}>{s.label}</Text>
                  <Text style={styles.stepOwner}>Assigned to: {s.owner}</Text>
                </View>
              </View>
              <Text style={styles.stepDesc}>{s.desc}</Text>
              <Text style={styles.stepOutcome}>Outcome: {s.outcome}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.assignmentTitle}>Team Assignments</Text>
        <View style={styles.assignmentGrid}>
          {ASSIGNMENTS.map((a, i) => (
            <View key={i} style={styles.assignmentCard}>
              <Text style={styles.assignmentRole}>{a.role}</Text>
              <Text style={styles.assignmentTask}>{a.task}</Text>
            </View>
          ))}
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>get started</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.actionStack}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/auth?mode=register')}>
            <Text style={styles.primaryBtnText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/auth')}>
            <Text style={styles.secondaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featureRow}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureItem, i < 2 && styles.featureItemBorder]}>
              <f.icon size={14} color="#B1121D" strokeWidth={2.3} />
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>(c) 2026 JRNZ Tracking Express. All rights reserved.</Text>
      </ScrollView>

      <TouchableOpacity style={styles.chatFab} onPress={() => setChatVisible(true)}>
        <MessageCircle size={24} color="#fff" strokeWidth={2.2} />
      </TouchableOpacity>

      <Modal visible={chatVisible} transparent animationType="fade" onRequestClose={() => setChatVisible(false)}>
        <View style={styles.chatOverlay}>
          <View style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactTitle}>Send a Message</Text>
              <TouchableOpacity onPress={() => setChatVisible(false)}>
                <X size={18} color="#B1121D" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.contactInput}
              placeholder="Your Name"
              placeholderTextColor="#bbb"
              value={supportName}
              onChangeText={(value) => {
                setSupportName(value);
                if (supportFeedback) {
                  setSupportFeedback('');
                  setFeedbackType('');
                }
              }}
              editable={!isSubmittingConcern}
            />

            <TextInput
              style={styles.contactInput}
              placeholder="Your Email"
              placeholderTextColor="#bbb"
              value={supportEmail}
              onChangeText={(value) => {
                setSupportEmail(value);
                if (supportFeedback) {
                  setSupportFeedback('');
                  setFeedbackType('');
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSubmittingConcern}
            />

            <TextInput
              style={[styles.contactInput, styles.contactTextarea]}
              placeholder="Your message or report..."
              placeholderTextColor="#bbb"
              value={supportConcern}
              onChangeText={(value) => {
                setSupportConcern(value);
                if (supportFeedback) {
                  setSupportFeedback('');
                  setFeedbackType('');
                }
              }}
              multiline
              textAlignVertical="top"
              editable={!isSubmittingConcern}
            />

            {!!supportFeedback && (
              <Text style={[styles.feedbackText, feedbackType === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
                {supportFeedback}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.contactSendBtn, isSubmittingConcern && styles.contactSendBtnDisabled]}
              onPress={submitSupportMessage}
              disabled={isSubmittingConcern}
            >
              <Text style={styles.contactSendText}>{isSubmittingConcern ? 'Sending...' : 'Send Message'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#7A0912' },

  topSection: { paddingBottom: 22, overflow: 'hidden' },
  circle1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.1)', top: -72, right: -48 },
  circle2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.09)', top: 90, left: -55 },
  circle3: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,220,220,0.2)', bottom: -52, right: 24 },

  header: { paddingHorizontal: 22, paddingTop: 52, paddingBottom: 14 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  logoText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  brandName: { fontSize: 15, fontWeight: '900', color: '#fff' },
  brandSub: { fontSize: 10, color: 'rgba(255,255,255,0.78)', fontWeight: '600', letterSpacing: 0.5 },

  headlineBlock: { paddingHorizontal: 22, marginBottom: 14 },
  headline: { fontSize: 15, fontWeight: '900', color: '#fff', lineHeight: 20, marginBottom: 8 },
  headlineSub: { fontSize: 11, color: 'rgba(255,255,255,0.87)', fontWeight: '600', letterSpacing: 0.3, lineHeight: 15 },

  trustStrip: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', paddingVertical: 10, paddingHorizontal: 16 },
  trustItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  trustText: { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  trustDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.2)', marginLeft: 8 },

  bottomCard: { backgroundColor: '#FDFDFE', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  bottomContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },

  liquidCard: {
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FBEAEC',
    shadowColor: '#B1121D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
    overflow: 'hidden',
  },
  liquidGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(186,19,34,0.12)',
    top: -130,
    right: -40,
  },
  trackLabel: { fontSize: 13, fontWeight: '800', color: '#7A111A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  trackHint: { fontSize: 12, color: '#5F5053', marginBottom: 12, lineHeight: 16 },
  trackRow: { flexDirection: 'row', gap: 10 },
  trackInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 13, color: '#212121', borderWidth: 1.5, borderColor: '#EECBD0' },
  trackBtn: { width: 48, backgroundColor: '#B1121D', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#92111A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  trackBtnDisabled: { backgroundColor: '#E5A9AE' },

  trackErrorBox: { backgroundColor: '#FFF6F7', borderRadius: 12, padding: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#B1121D' },
  trackErrorRow: { flexDirection: 'row', alignItems: 'flex-start' },
  trackErrorIconWrap: { marginTop: 1, marginRight: 6 },
  trackErrorText: { flex: 1, fontSize: 13, color: '#9A1420', fontWeight: '600', lineHeight: 18 },

  trackResultCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#F3D7DB', shadowColor: '#BE3440', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  trackResultNum: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 2 },
  trackResultStatus: { fontSize: 13, color: '#8C1F2A', marginBottom: 14, fontWeight: '700' },
  trackTimeline: { flexDirection: 'row', marginBottom: 14 },
  trackStepWrap: { flex: 1, alignItems: 'center', position: 'relative' },
  trackLine: { position: 'absolute', top: 13, right: '50%', left: '-50%', height: 2, backgroundColor: '#e7d4d4' },
  trackLineDone: { backgroundColor: '#B1121D' },
  trackDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F4EFF0', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  trackDotDone: { backgroundColor: '#B1121D' },
  trackStepLabel: { fontSize: 10, color: '#949494', marginTop: 4, textAlign: 'center' },
  trackStepLabelDone: { color: '#B1121D', fontWeight: '700' },
  trackAddressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  trackAddressIconWrap: { marginTop: 2 },
  trackAddressLabel: { fontSize: 10, color: '#8d8d8d', marginBottom: 2 },
  trackAddressValue: { fontSize: 13, color: '#333', fontWeight: '500' },
  trackRiderRow: { marginTop: 10, backgroundColor: '#F7F2F3', borderRadius: 8, padding: 8 },
  trackRiderInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trackRiderText: { color: '#333', fontSize: 12, fontWeight: '600' },
  trackExceptionRow: { marginTop: 10, backgroundColor: '#FFF3E0', borderRadius: 8, padding: 8 },
  trackExceptionText: { fontSize: 12, color: '#E65100', fontWeight: '700' },
  trackUpdated: { fontSize: 10, color: '#bbb', marginTop: 10, textAlign: 'right' },

  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#7A111A', letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  sectionSubtitle: { fontSize: 12, color: '#777', marginBottom: 12 },
  stepsColumn: { marginBottom: 16, gap: 10 },
  stepCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F5DEE1', borderRadius: 14, padding: 12 },
  stepHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#B1121D', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  stepBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  stepHeaderCopy: { flex: 1 },
  stepLabel: { fontSize: 13, fontWeight: '800', color: '#1f1f1f' },
  stepOwner: { fontSize: 11, color: '#B00020', fontWeight: '700', marginTop: 1 },
  stepDesc: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 6 },
  stepOutcome: { fontSize: 11, color: '#2e7d32', fontWeight: '700' },

  assignmentTitle: { fontSize: 12, fontWeight: '900', color: '#7A111A', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' },
  assignmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  assignmentCard: { width: '48%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F7DFE2', borderRadius: 12, padding: 10 },
  assignmentRole: { fontSize: 12, fontWeight: '800', color: '#9A1420', marginBottom: 4 },
  assignmentTask: { fontSize: 11, color: '#666', lineHeight: 15 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  divider: { flex: 1, height: 1, backgroundColor: '#f0f0f0' },
  dividerText: { fontSize: 11, color: '#bbb', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },

  actionStack: { gap: 10, marginBottom: 20 },
  primaryBtn: { backgroundColor: '#B1121D', minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, shadowColor: '#8F1018', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 5 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  secondaryBtn: { backgroundColor: '#FFFFFF', minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#B1121D', paddingHorizontal: 16 },
  secondaryBtnText: { color: '#B1121D', fontWeight: '800', fontSize: 14 },

  featureRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 10, marginBottom: 16, borderWidth: 1, borderColor: '#F4E1E4' },
  featureItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, gap: 6 },
  featureItemBorder: { borderRightWidth: 1, borderRightColor: '#EFE5E6' },
  featureLabel: { fontSize: 10, fontWeight: '700', color: '#54484A', textAlign: 'center' },

  footer: { textAlign: 'center', color: '#ccc', fontSize: 10 },

  chatFab: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#B1121D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 7,
  },
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 14 },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9C8CD',
    padding: 14,
    gap: 10,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactTitle: { fontSize: 15, fontWeight: '900', color: '#B1121D' },
  contactInput: {
    borderWidth: 1,
    borderColor: '#F0D1D5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#333',
    backgroundColor: '#FFFAFA',
  },
  contactTextarea: {
    minHeight: 94,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackSuccess: {
    color: '#2e7d32',
  },
  feedbackError: {
    color: '#b71c1c',
  },
  contactSendBtn: {
    backgroundColor: '#B1121D',
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  contactSendBtnDisabled: {
    backgroundColor: '#E5A9AE',
  },
  contactSendText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
