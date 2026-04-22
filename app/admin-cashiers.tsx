import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, Image, TextInput } from 'react-native';
import { router } from 'expo-router';
import { authAPI } from '../services/api';
import { resolveMediaUrl } from '../utils/media';

export default function AdminCashiers() {
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { fetchCashiers(); }, []);

  const fetchCashiers = async () => {
    try {
      const res = await authAPI.getCashiers();
      setCashiers(res.data);
    } catch { Alert.alert('Error', 'Failed to load cashiers'); }
    finally { setLoading(false); }
  };

  const handleApprove = (cashier: any) => {
    Alert.alert('Approve Cashier', `Approve ${cashier.first_name} ${cashier.last_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        try {
          await authAPI.approveRider(cashier.id);
          Alert.alert('Success', 'Cashier approved. A confirmation email has been sent.');
          setSelected(null);
          fetchCashiers();
        } catch { Alert.alert('Error', 'Failed to approve cashier'); }
      }},
    ]);
  };

  const handleReject = async (cashier: any, reason: string) => {
    try {
      await authAPI.rejectUser(cashier.id, reason);
      Alert.alert('Done', 'Cashier rejected and notified via email.');
      setSelected(null);
      fetchCashiers();
    } catch { Alert.alert('Error', 'Failed to reject cashier'); }
  };

  const pending = cashiers.filter(c => !c.is_approved);
  const approved = cashiers.filter(c => c.is_approved);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manage Cashiers</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: '#FF9800' }]}>
              <Text style={styles.summaryNum}>{pending.length}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.summaryNum}>{approved.length}</Text>
              <Text style={styles.summaryLabel}>Approved</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#2196F3' }]}>
              <Text style={styles.summaryNum}>{cashiers.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
          </View>

          {cashiers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyText}>No cashiers registered yet</Text>
            </View>
          ) : (
            <>
              {pending.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>⏳ Pending Approval</Text>
                  {pending.map(c => (
                    <CashierCard key={c.id} cashier={c} onApprove={handleApprove} onView={() => setSelected(c)} />
                  ))}
                </>
              )}
              {approved.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>✅ Approved Cashiers</Text>
                  {approved.map(c => (
                    <CashierCard key={c.id} cashier={c} onApprove={handleApprove} onView={() => setSelected(c)} />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      <UserDetailModal
        visible={!!selected}
        user={selected}
        onClose={() => setSelected(null)}
        onApprove={selected && !selected.is_approved ? () => handleApprove(selected) : undefined}
        onReject={selected && !selected.is_approved ? (reason) => handleReject(selected, reason) : undefined}
      />
    </View>
  );
}

function CashierCard({ cashier, onApprove, onView }: { cashier: any; onApprove: (c: any) => void; onView: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onView} activeOpacity={0.85}>
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{cashier.first_name?.[0]}{cashier.last_name?.[0]}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{cashier.first_name} {cashier.last_name}</Text>
          <Text style={styles.cardDetail}>@{cashier.username}</Text>
          {cashier.phone && <Text style={styles.cardDetail}>📞 {cashier.phone}</Text>}
          {cashier.email && <Text style={styles.cardDetail}>✉️ {cashier.email}</Text>}
          <View style={[styles.statusBadge, cashier.is_approved ? styles.statusApproved : styles.statusPending]}>
            <Text style={styles.statusText}>{cashier.is_approved ? '✅ Approved' : '⏳ Pending'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Text style={styles.viewHint}>View Details →</Text>
        {!cashier.is_approved && (
          <TouchableOpacity style={styles.approveBtn} onPress={() => onApprove(cashier)}>
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function UserDetailModal({ visible, user, onClose, onApprove, onReject }: {
  visible: boolean; user: any;
  onClose: () => void; onApprove?: () => void; onReject?: (reason: string) => void;
}) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!user) return null;

  const idImageUrl = resolveMediaUrl(user.identity_image);

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) { Alert.alert('Required', 'Please enter a reason for rejection.'); return; }
    Alert.alert('Confirm Rejection', `Reject ${user.first_name} ${user.last_name}?\n\nReason: ${rejectReason}\n\nThey will be notified via email and their account will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => { setShowRejectModal(false); setRejectReason(''); onReject!(rejectReason.trim()); } },
    ]);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalAvatarRow}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>{user.first_name?.[0]}{user.last_name?.[0]}</Text>
                </View>
                <View>
                  <Text style={styles.modalName}>{user.first_name} {user.last_name}</Text>
                  <Text style={styles.modalUsername}>@{user.username}</Text>
                  <View style={[styles.statusBadge, user.is_approved ? styles.statusApproved : styles.statusPending]}>
                    <Text style={styles.statusText}>{user.is_approved ? '✅ Approved' : '⏳ Pending Approval'}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Personal Information</Text>
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Phone" value={user.phone} />
                <InfoRow label="Address" value={user.address} />
                <InfoRow label="Member Since" value={user.created_at ? new Date(user.created_at).toLocaleDateString() : null} />
              </View>
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Identity Verification</Text>
                {idImageUrl ? (
                  <><Text style={styles.idLabel}>Uploaded ID Document</Text><Image source={{ uri: idImageUrl }} style={styles.idImage} resizeMode="contain" /></>
                ) : (
                  <View style={styles.noIdBox}><Text style={styles.noIdText}>⚠️ No ID uploaded</Text></View>
                )}
              </View>
              {(onApprove || onReject) && (
                <View style={styles.actionRow}>
                  {onApprove && <TouchableOpacity style={styles.modalApproveBtn} onPress={onApprove}><Text style={styles.modalApproveBtnText}>✓ Approve</Text></TouchableOpacity>}
                  {onReject && <TouchableOpacity style={styles.modalRejectBtn} onPress={() => setShowRejectModal(true)}><Text style={styles.modalRejectBtnText}>✕ Reject</Text></TouchableOpacity>}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showRejectModal} animationType="fade" transparent onRequestClose={() => setShowRejectModal(false)}>
        <View style={styles.reasonOverlay}>
          <View style={styles.reasonCard}>
            <Text style={styles.reasonTitle}>Rejection Reason</Text>
            <Text style={styles.reasonSubtitle}>This will be sent to {user.first_name} via email.</Text>
            <TextInput style={styles.reasonInput} placeholder="e.g. Uploaded ID is unclear, incomplete information..." placeholderTextColor="#aaa" value={rejectReason} onChangeText={setRejectReason} multiline numberOfLines={4} textAlignVertical="top" />
            <View style={styles.reasonBtnRow}>
              <TouchableOpacity style={styles.reasonCancelBtn} onPress={() => { setShowRejectModal(false); setRejectReason(''); }}><Text style={styles.reasonCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.reasonSubmitBtn} onPress={handleRejectSubmit}><Text style={styles.reasonSubmitText}>Send Rejection</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#ED1C24' },
  backBtn: { fontSize: 28, color: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 15 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryNum: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  summaryLabel: { fontSize: 12, color: '#fff', opacity: 0.9, marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#ED1C24', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 2 },
  cardDetail: { fontSize: 12, color: '#888', marginBottom: 1 },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  viewHint: { fontSize: 12, color: '#ED1C24', fontWeight: '600' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  statusApproved: { backgroundColor: '#E8F5E9' },
  statusPending: { backgroundColor: '#FFF3E0' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#333' },
  approveBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  approveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingHorizontal: 20, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
  modalClose: { fontSize: 20, color: '#999', fontWeight: '600' },
  modalAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  modalAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ED1C24', justifyContent: 'center', alignItems: 'center' },
  modalAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 22 },
  modalName: { fontSize: 18, fontWeight: '800', color: '#333' },
  modalUsername: { fontSize: 13, color: '#888', marginBottom: 4 },
  infoSection: { backgroundColor: '#f9f9f9', borderRadius: 14, padding: 14, marginBottom: 14 },
  infoSectionTitle: { fontSize: 12, fontWeight: '700', color: '#ED1C24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel: { fontSize: 13, color: '#888', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#333', fontWeight: '600', flex: 1, textAlign: 'right' },
  idLabel: { fontSize: 12, color: '#888', marginBottom: 10 },
  idImage: { width: '100%', height: 220, borderRadius: 12, backgroundColor: '#f0f0f0' },
  noIdBox: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#FFF3E0', borderRadius: 10 },
  noIdText: { fontSize: 14, color: '#FF9800', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalApproveBtn: { flex: 1, backgroundColor: '#4CAF50', padding: 15, borderRadius: 14, alignItems: 'center' },
  modalApproveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalRejectBtn: { flex: 1, backgroundColor: '#ED1C24', padding: 15, borderRadius: 14, alignItems: 'center' },
  modalRejectBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  reasonOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  reasonCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  reasonTitle: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 6 },
  reasonSubtitle: { fontSize: 13, color: '#888', marginBottom: 16 },
  reasonInput: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, padding: 14, fontSize: 14, color: '#333', minHeight: 110, backgroundColor: '#fafafa', marginBottom: 16 },
  reasonBtnRow: { flexDirection: 'row', gap: 10 },
  reasonCancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center' },
  reasonCancelText: { fontSize: 14, fontWeight: '600', color: '#666' },
  reasonSubmitBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#ED1C24', alignItems: 'center' },
  reasonSubmitText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
});
