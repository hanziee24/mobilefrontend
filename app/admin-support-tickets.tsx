import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert, Modal } from 'react-native';
import { router } from 'expo-router';
import { supportAPI } from '../services/api';

type TicketStatus = 'PENDING' | 'IN_REVIEW' | 'RESOLVED';
type ConcernType = 'GENERAL' | 'RIDER_APPLICATION' | 'CASHIER_APPLICATION';

interface Ticket {
  id: number;
  name: string;
  email: string;
  concern: string;
  concern_type: ConcernType;
  status: TicketStatus;
  staff_notes: string;
  created_at: string;
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  PENDING: '#FF9800',
  IN_REVIEW: '#2196F3',
  RESOLVED: '#4CAF50',
};

const TYPE_LABELS: Record<ConcernType, string> = {
  GENERAL: '💬 General',
  RIDER_APPLICATION: '🏍️ Rider Application',
  CASHIER_APPLICATION: '🧾 Cashier Application',
};

const FILTER_TABS: { label: string; value: TicketStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'In Review', value: 'IN_REVIEW' },
  { label: 'Resolved', value: 'RESOLVED' },
];

export default function AdminSupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const params = filter !== 'ALL' ? { status: filter } : undefined;
      const res = await supportAPI.getTickets(params);
      setTickets(res.data);
    } catch {
      Alert.alert('Error', 'Failed to load support tickets.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const openTicket = (ticket: Ticket) => {
    setSelected(ticket);
    setNotes(ticket.staff_notes || '');
  };

  const updateTicket = async (status: TicketStatus) => {
    if (!selected) return;
    setUpdating(true);
    try {
      await supportAPI.updateTicket(selected.id, { status, staff_notes: notes });
      setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, status, staff_notes: notes } : t));
      setSelected(null);
      Alert.alert('Updated', `Ticket marked as ${status.replace('_', ' ')}.`);
    } catch {
      Alert.alert('Error', 'Failed to update ticket.');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const filtered = filter === 'ALL' ? tickets : tickets.filter(t => t.status === filter);
  const pendingCount = tickets.filter(t => t.status === 'PENDING').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Support Tickets</Text>
          {pendingCount > 0 && <Text style={styles.pendingBadge}>{pendingCount} pending</Text>}
        </View>
        <View style={{ width: 30 }} />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity key={tab.value} style={[styles.filterTab, filter === tab.value && styles.filterTabActive]} onPress={() => setFilter(tab.value)}>
            <Text style={[styles.filterTabText, filter === tab.value && styles.filterTabTextActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 50 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No tickets found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 15, gap: 10 }}>
          {filtered.map(ticket => (
            <TouchableOpacity key={ticket.id} style={styles.ticketCard} onPress={() => openTicket(ticket)}>
              <View style={styles.ticketTop}>
                <Text style={styles.ticketName}>{ticket.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[ticket.status] }]}>
                  <Text style={styles.statusText}>{ticket.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.ticketType}>{TYPE_LABELS[ticket.concern_type]}</Text>
              <Text style={styles.ticketEmail}>{ticket.email}</Text>
              <Text style={styles.ticketConcern} numberOfLines={2}>{ticket.concern}</Text>
              <Text style={styles.ticketDate}>{formatDate(ticket.created_at)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Ticket detail modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ticket #{selected?.id}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selected?.status || 'PENDING'], alignSelf: 'flex-start', marginBottom: 12 }]}>
                <Text style={styles.statusText}>{selected?.status?.replace('_', ' ')}</Text>
              </View>

              <Text style={styles.detailType}>{TYPE_LABELS[selected?.concern_type || 'GENERAL']}</Text>
              <Text style={styles.detailLabel}>From</Text>
              <Text style={styles.detailValue}>{selected?.name} — {selected?.email}</Text>
              <Text style={styles.detailLabel}>Submitted</Text>
              <Text style={styles.detailValue}>{selected ? formatDate(selected.created_at) : ''}</Text>
              <Text style={styles.detailLabel}>Message</Text>
              <View style={styles.concernBox}>
                <Text style={styles.concernText}>{selected?.concern}</Text>
              </View>

              <Text style={styles.detailLabel}>Staff Notes</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about this ticket..."
                placeholderTextColor="#bbb"
                multiline
                textAlignVertical="top"
              />

              <View style={styles.actionRow}>
                {selected?.status !== 'IN_REVIEW' && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2196F3' }]} onPress={() => updateTicket('IN_REVIEW')} disabled={updating}>
                    <Text style={styles.actionBtnText}>Mark In Review</Text>
                  </TouchableOpacity>
                )}
                {selected?.status !== 'RESOLVED' && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]} onPress={() => updateTicket('RESOLVED')} disabled={updating}>
                    {updating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionBtnText}>Mark Resolved</Text>}
                  </TouchableOpacity>
                )}
                {selected?.status === 'RESOLVED' && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF9800' }]} onPress={() => updateTicket('PENDING')} disabled={updating}>
                    <Text style={styles.actionBtnText}>Reopen</Text>
                  </TouchableOpacity>
                )}
              </View>

              {(selected?.concern_type === 'RIDER_APPLICATION' || selected?.concern_type === 'CASHIER_APPLICATION') && (
                <TouchableOpacity style={styles.createStaffBtn} onPress={() => {
                  setSelected(null);
                  router.push({ pathname: '/admin-create-staff', params: { type: selected?.concern_type === 'RIDER_APPLICATION' ? 'RIDER' : 'CASHIER' } });
                }}>
                  <Text style={styles.createStaffBtnText}>
                    {selected?.concern_type === 'RIDER_APPLICATION' ? '🏍️ Create Rider Account' : '🧾 Create Cashier Account'}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#1a1a1a', borderBottomWidth: 3, borderBottomColor: '#ED1C24' },
  backBtn: { fontSize: 26, color: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  pendingBadge: { fontSize: 11, color: '#FF9800', fontWeight: '700', marginTop: 2 },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: { backgroundColor: '#ED1C24', borderColor: '#ED1C24' },
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  filterTabTextActive: { color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#999', fontWeight: '600' },
  ticketCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ticketName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  ticketType: { fontSize: 12, fontWeight: '600', color: '#ED1C24', marginBottom: 2 },
  ticketEmail: { fontSize: 12, color: '#888', marginBottom: 6 },
  ticketConcern: { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 6 },
  ticketDate: { fontSize: 11, color: '#bbb' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  modalClose: { fontSize: 18, color: '#999', fontWeight: '700' },
  detailType: { fontSize: 13, fontWeight: '700', color: '#ED1C24', marginBottom: 12 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 10 },
  detailValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  concernBox: { backgroundColor: '#FFF5F5', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#ED1C24' },
  concernText: { fontSize: 14, color: '#333', lineHeight: 20 },
  notesInput: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 14, color: '#333', minHeight: 80, backgroundColor: '#fafafa', marginBottom: 14 },
  actionRow: { flexDirection: 'column', gap: 10, marginBottom: 12 },
  actionBtn: {
    width: '100%',
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  createStaffBtn: { backgroundColor: '#ED1C24', minHeight: 48, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  createStaffBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
