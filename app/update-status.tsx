import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { deliveryAPI } from '../services/api';

const STATUS_FLOW: Record<string, { next: string; icon: string; label: string; color: string }[]> = {
  PENDING: [
    { next: 'PICKED_UP', icon: '📦', label: 'Picked Up', color: '#2196F3' },
  ],
  PICKED_UP: [
    { next: 'IN_TRANSIT', icon: '🚚', label: 'In Transit', color: '#FF9800' },
  ],
  IN_TRANSIT: [
    { next: 'OUT_FOR_DELIVERY', icon: '🏠', label: 'Out for Delivery', color: '#9C27B0' },
  ],
  OUT_FOR_DELIVERY: [
    { next: 'DELIVERED', icon: '✅', label: 'Delivered', color: '#4CAF50' },
  ],
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: '⏳ Pending',
  PICKED_UP: '📦 Picked Up',
  IN_TRANSIT: '🚚 In Transit',
  OUT_FOR_DELIVERY: '🏠 Out for Delivery',
  DELIVERED: '✅ Delivered',
};

export default function UpdateStatus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    if (id) {
      deliveryAPI.getDelivery(Number(id))
        .then(res => {
          setDelivery(res.data);
          const options = STATUS_FLOW[res.data.status];
          if (options?.length) setSelectedStatus(options[0].next);
        })
        .catch(() => Alert.alert('Error', 'Failed to load delivery'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id]);

  const handleUpdate = async () => {
    if (!selectedStatus || !delivery) return;
    Alert.alert(
      'Confirm Update',
      `Mark delivery as "${STATUS_LABEL[selectedStatus]}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSubmitting(true);
            try {
              await deliveryAPI.updateStatus(delivery.id, selectedStatus);
              Alert.alert('✅ Updated', `Status updated to ${STATUS_LABEL[selectedStatus]}`, [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.error || 'Failed to update status');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#ED1C24" />
    </View>
  );

  if (!delivery) return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Update Status</Text>
        <View style={{ width: 30 }} />
      </View>
      <View style={styles.center}>
        <Text style={styles.emptyText}>No delivery found</Text>
      </View>
    </View>
  );

  const options = STATUS_FLOW[delivery.status] || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Update Status</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.content}>
        {/* Delivery info */}
        <View style={styles.infoCard}>
          <Text style={styles.tracking}>#{delivery.tracking_number}</Text>
          <Text style={styles.receiver}>{delivery.receiver_name}</Text>
          <Text style={styles.address} numberOfLines={2}>{delivery.delivery_address?.split('|')[0]}</Text>
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current: {STATUS_LABEL[delivery.status] || delivery.status}</Text>
          </View>
        </View>

        {/* Status timeline progress */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Delivery Progress</Text>
          <View style={styles.timeline}>
            {['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((s, i, arr) => {
              const statuses = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
              const currentIdx = statuses.indexOf(delivery.status);
              const done = i <= currentIdx;
              return (
                <View key={s} style={styles.timelineStep}>
                  {i > 0 && <View style={[styles.timelineLine, done && styles.timelineLineDone]} />}
                  <View style={[styles.timelineDot, done && styles.timelineDotDone]}>
                    <Text style={styles.timelineDotIcon}>{STATUS_LABEL[s]?.split(' ')[0]}</Text>
                  </View>
                  <Text style={[styles.timelineLabel, done && styles.timelineLabelDone]} numberOfLines={2}>
                    {STATUS_LABEL[s]?.split(' ').slice(1).join(' ')}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Next status options */}
        {options.length === 0 ? (
          <View style={styles.doneCard}>
            <Text style={styles.doneIcon}>✅</Text>
            <Text style={styles.doneText}>Delivery is complete</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Update to next status</Text>
            {options.map(opt => (
              <TouchableOpacity
                key={opt.next}
                style={[styles.statusOption, selectedStatus === opt.next && styles.statusOptionSelected, { borderColor: selectedStatus === opt.next ? opt.color : '#e0e0e0' }]}
                onPress={() => setSelectedStatus(opt.next)}
              >
                <Text style={styles.statusOptionIcon}>{opt.icon}</Text>
                <Text style={[styles.statusOptionLabel, selectedStatus === opt.next && { color: opt.color }]}>{opt.label}</Text>
                {selectedStatus === opt.next && <Text style={[styles.check, { color: opt.color }]}>✓</Text>}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.updateBtn, (!selectedStatus || submitting) && styles.updateBtnDisabled]}
              onPress={handleUpdate}
              disabled={!selectedStatus || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.updateBtnText}>Update Status</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#ED1C24' },
  backBtn: { fontSize: 28, color: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 15 },

  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  tracking: { fontSize: 18, fontWeight: 'bold', color: '#ED1C24', marginBottom: 4 },
  receiver: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  address: { fontSize: 13, color: '#888', marginBottom: 10 },
  currentBadge: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  currentBadgeText: { fontSize: 12, fontWeight: '600', color: '#555' },

  timelineCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  timelineTitle: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeline: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineStep: { flex: 1, alignItems: 'center', position: 'relative' },
  timelineLine: { position: 'absolute', top: 14, right: '50%', left: '-50%', height: 2, backgroundColor: '#e0e0e0' },
  timelineLineDone: { backgroundColor: '#ED1C24' },
  timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  timelineDotDone: { backgroundColor: '#ED1C24' },
  timelineDotIcon: { fontSize: 12 },
  timelineLabel: { fontSize: 9, color: '#aaa', marginTop: 4, textAlign: 'center' },
  timelineLabelDone: { color: '#ED1C24', fontWeight: '600' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: '#e0e0e0', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  statusOptionSelected: { backgroundColor: '#fafafa' },
  statusOptionIcon: { fontSize: 26, marginRight: 14 },
  statusOptionLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#333' },
  check: { fontSize: 20, fontWeight: 'bold' },

  updateBtn: { backgroundColor: '#ED1C24', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  updateBtnDisabled: { backgroundColor: '#ccc' },
  updateBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  doneCard: { alignItems: 'center', paddingVertical: 40 },
  doneIcon: { fontSize: 52, marginBottom: 12 },
  doneText: { fontSize: 16, color: '#666', fontWeight: '600' },
  emptyText: { fontSize: 16, color: '#999' },
});
