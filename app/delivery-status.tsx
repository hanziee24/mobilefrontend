import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { deliveryAPI, API_URL } from '../services/api';

interface Delivery {
  id: number;
  tracking_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  delivery_address: string;
  proof_of_delivery?: string;
  estimated_time?: string;
}

const STEPS = [
  { key: 'PENDING', label: 'Pending', icon: '⏳' },
  { key: 'PICKED_UP', label: 'Picked Up', icon: '📦' },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: '🚚' },
  { key: 'DELIVERED', label: 'Delivered', icon: '✓' },
];

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0, PICKED_UP: 1, IN_TRANSIT: 1, OUT_FOR_DELIVERY: 2, DELIVERED: 3,
};

function StatusTimeline({ status }: { status: string }) {
  const current = STATUS_ORDER[status] ?? 0;
  return (
    <View style={tlStyles.row}>
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <View key={step.key} style={tlStyles.stepWrap}>
            {i > 0 && <View style={[tlStyles.line, done && tlStyles.lineDone]} />}
            <View style={[tlStyles.dot, done && tlStyles.dotDone]}>
              <Text style={tlStyles.dotIcon}>{step.icon}</Text>
            </View>
            <Text style={[tlStyles.label, done && tlStyles.labelDone]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function DeliveryStatus() {
  const [activeTab, setActiveTab] = useState('in-transit');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [proofImage, setProofImage] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDeliveries = async () => {
    try {
      const response = await deliveryAPI.getAllDeliveries();
      setDeliveries(response.data);
    } catch (error: any) {
      // Silently handle auth errors
      if (error.response?.status !== 403 && error.response?.status !== 401) {
        console.log('Error fetching deliveries:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const filterByStatus = (status: string[]) => {
    return deliveries.filter(d => status.includes(d.status));
  };

  const handleCancel = (order: Delivery) => {
    Alert.alert('Cancel Delivery', `Cancel ${order.tracking_number}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try {
          await deliveryAPI.cancelDelivery(order.id);
          fetchDeliveries();
        } catch (error: any) {
          Alert.alert('Error', error.response?.data?.error || 'Failed to cancel delivery');
        }
      }},
    ]);
  };

  const pending = filterByStatus(['PENDING']);
  const inTransit = filterByStatus(['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']);
  const delivered = filterByStatus(['DELIVERED']);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Delivery Status</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending ({pending.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'in-transit' && styles.activeTab]}
          onPress={() => setActiveTab('in-transit')}
        >
          <Text style={[styles.tabText, activeTab === 'in-transit' && styles.activeTabText]}>
            In Transit ({inTransit.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'delivered' && styles.activeTab]}
          onPress={() => setActiveTab('delivered')}
        >
          <Text style={[styles.tabText, activeTab === 'delivered' && styles.activeTabText]}>
            Delivered ({delivered.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 50 }} />
        ) : (
          <>
        {activeTab === 'pending' && (pending.length === 0 ? (
          <Text style={styles.emptyText}>No pending deliveries</Text>
        ) : pending.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.statusIcon}>
              <Text style={styles.iconText}>⏳</Text>
            </View>
            <View style={styles.orderInfo}>
              <Text style={styles.orderId}>{order.tracking_number}</Text>
              <Text style={styles.detail}>📍 {order.delivery_address}</Text>
              <Text style={styles.time}>{new Date(order.created_at).toLocaleString()}</Text>
              <StatusTimeline status={order.status} />
              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(order)}>
                <Text style={styles.cancelBtnText}>Cancel Delivery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )))}

        {activeTab === 'in-transit' && (inTransit.length === 0 ? (
          <Text style={styles.emptyText}>No deliveries in transit</Text>
        ) : inTransit.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => router.push({ pathname: '/track-delivery', params: { id: String(order.id) } })}
          >
            <View style={[styles.statusIcon, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.iconText}>🚚</Text>
            </View>
            <View style={styles.orderInfo}>
              <Text style={styles.orderId}>{order.tracking_number}</Text>
              <Text style={styles.detail}>📍 {order.delivery_address}</Text>
              <Text style={styles.time}>ETA: {order.estimated_time || 'Calculating...'}</Text>
              <StatusTimeline status={order.status} />
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )))}

        {activeTab === 'delivered' && (delivered.length === 0 ? (
          <Text style={styles.emptyText}>No delivered orders</Text>
        ) : delivered.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={[styles.statusIcon, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.iconText}>✓</Text>
            </View>
            <View style={styles.orderInfo}>
              <Text style={styles.orderId}>{order.tracking_number}</Text>
              <Text style={styles.detail}>{order.delivery_address}</Text>
              <Text style={styles.time}>{new Date(order.updated_at).toLocaleString()}</Text>
              <StatusTimeline status={order.status} />
              {order.proof_of_delivery && (
                <TouchableOpacity
                  style={styles.proofBtn}
                  onPress={() => setProofImage(`${API_URL.replace('/api', '')}${order.proof_of_delivery}`)}
                >
                  <Text style={styles.proofBtnText}>📸 View Proof of Delivery</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )))}
          </>
        )}
      </ScrollView>

      {/* Full screen proof image modal */}
      <Modal visible={!!proofImage} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setProofImage(null)}>
          <Image source={{ uri: proofImage! }} style={styles.fullImage} resizeMode="contain" />
          <Text style={styles.modalClose}>✕ Tap anywhere to close</Text>
        </TouchableOpacity>
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
  backButton: { fontSize: 28, color: '#333' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  activeTab: { backgroundColor: '#ED1C24' },
  tabText: { fontSize: 13, color: '#666', fontWeight: '600' },
  activeTabText: { color: '#fff' },
  content: { flex: 1, padding: 15 },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 24 },
  orderInfo: { flex: 1 },
  orderId: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  detail: { fontSize: 14, color: '#666', marginBottom: 2 },
  time: { fontSize: 12, color: '#999' },
  arrow: { fontSize: 24, color: '#ddd' },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    marginTop: 50,
  },
  proofBtn: {
    marginTop: 8,
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  proofBtnText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 10,
    backgroundColor: '#ED1C24',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '95%',
    height: '80%',
  },
  modalClose: {
    color: '#fff',
    marginTop: 15,
    fontSize: 14,
    opacity: 0.7,
  },
});

const tlStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  stepWrap: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  line: {
    position: 'absolute',
    top: 12,
    right: '50%',
    left: '-50%',
    height: 2,
    backgroundColor: '#ddd',
  },
  lineDone: { backgroundColor: '#ED1C24' },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  dotDone: { backgroundColor: '#ED1C24' },
  dotIcon: { fontSize: 12 },
  label: { fontSize: 9, color: '#aaa', marginTop: 3, textAlign: 'center' },
  labelDone: { color: '#ED1C24', fontWeight: '600' },
});
