import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, FlatList, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, LayoutDashboard, PackageCheck, UserRound } from 'lucide-react-native';
import { authAPI, deliveryAPI } from '../services/api';

const MAX_RIDER_DISTANCE_KM = 30;

const toFloat = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractCoordinatesFromAddress = (address?: string): { lat: number; lng: number } | null => {
  if (!address) return null;
  const candidate = address.split('|').pop()?.trim() || '';
  const parts = candidate.split(',').map((part) => part.trim());
  if (parts.length !== 2) return null;

  const lat = toFloat(parts[0]);
  const lng = toFloat(parts[1]);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
};

const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
};

interface Delivery {
  id: number;
  tracking_number: string;
  customer_name: string;
  sender_name?: string;
  sender_contact?: string;
  receiver_name?: string;
  receiver_contact?: string;
  rider_name?: string;
  rider_details?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  status: string;
  delivery_fee: string;
  is_approved: boolean;
  delivery_address: string;
  proof_of_delivery?: string;
  recipient_name?: string;
  delivery_notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface Rider {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  is_online: boolean;
  is_approved: boolean;
  branch?: number | null;
  branch_name?: string;
}

interface Branch {
  id: number;
  name: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  is_active?: boolean;
}

export default function AdminDeliveries() {
  const insets = useSafeAreaInsets();
  const navSafeInset = Math.max(insets.bottom, 0);
  const navHeightCompensation = 72 + navSafeInset;
  const [filter, setFilter] = useState('all');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchDeliveries();
    fetchRiders();
    fetchBranches();
    const interval = setInterval(fetchDeliveries, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDeliveries = async () => {
    try {
      const response = await deliveryAPI.getAllDeliveries();
      setDeliveries(response.data);
    } catch (error: any) {
      if (error.response?.status !== 403 && error.response?.status !== 401) {
        console.log('Error fetching deliveries:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRiders = async () => {
    try {
      const response = await deliveryAPI.getAllRiders();
      // Filter to only show approved and online riders
      const onlineRiders = response.data.filter((r: Rider) => r.is_approved && r.is_online);
      setRiders(onlineRiders);
    } catch (error) {
      console.log('Error fetching riders:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await authAPI.getBranches();
      const activeBranches = (response.data || []).filter((branch: Branch) => branch.is_active !== false);
      setBranches(activeBranches);
    } catch (error) {
      console.log('Error fetching branches:', error);
    }
  };

  const selectedDeliveryCoordinates = useMemo(
    () => extractCoordinatesFromAddress(selectedDelivery?.delivery_address),
    [selectedDelivery?.delivery_address]
  );

  const nearestBranch = useMemo(() => {
    if (!selectedDeliveryCoordinates) return null;

    let best: { branch: Branch; distance: number } | null = null;
    for (const branch of branches) {
      const lat = toFloat(branch.latitude);
      const lng = toFloat(branch.longitude);
      if (lat === null || lng === null) continue;

      const branchDistance = distanceKm(lat, lng, selectedDeliveryCoordinates.lat, selectedDeliveryCoordinates.lng);
      if (!best || branchDistance < best.distance) {
        best = { branch, distance: branchDistance };
      }
    }

    return best;
  }, [branches, selectedDeliveryCoordinates]);

  const riderPickerState = useMemo(() => {
    if (!selectedDelivery) {
      return { canAssign: false, message: 'Select a delivery first.', nearestHubName: '' };
    }
    if (!selectedDeliveryCoordinates) {
      return {
        canAssign: false,
        message: 'Delivery address has no map pin. Set the location on map first.',
        nearestHubName: '',
      };
    }
    if (!nearestBranch) {
      return {
        canAssign: false,
        message: 'No active hub with map pin is configured.',
        nearestHubName: '',
      };
    }
    if (nearestBranch.distance > MAX_RIDER_DISTANCE_KM) {
      return {
        canAssign: false,
        message: `Nearest hub (${nearestBranch.branch.name}) is ${nearestBranch.distance.toFixed(1)}km away, beyond ${MAX_RIDER_DISTANCE_KM}km.`,
        nearestHubName: nearestBranch.branch.name,
      };
    }
    return {
      canAssign: true,
      message: `Showing online riders from ${nearestBranch.branch.name} hub.`,
      nearestHubName: nearestBranch.branch.name,
    };
  }, [nearestBranch, selectedDelivery, selectedDeliveryCoordinates]);

  const eligibleRiders = useMemo(() => {
    if (!riderPickerState.canAssign || !nearestBranch) return [];
    return riders.filter((rider) => rider.branch === nearestBranch.branch.id);
  }, [nearestBranch, riderPickerState.canAssign, riders]);

  const handleApprove = async (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    // Refresh riders list to get latest online status
    await Promise.all([fetchRiders(), fetchBranches()]);
    setShowRiderModal(true);
  };

  const handleAssignRider = async (riderId: number) => {
    if (!selectedDelivery) return;
    
    // Double-check rider is still online
    const rider = eligibleRiders.find(r => r.id === riderId);
    if (!rider || !rider.is_online) {
      Alert.alert('Error', 'This rider is now offline. Please select another rider.');
      await fetchRiders(); // Refresh the list
      return;
    }
    
    try {
      if (!selectedDelivery.is_approved) {
        await deliveryAPI.approveDelivery(selectedDelivery.id);
      }
      await deliveryAPI.assignRider(selectedDelivery.id, riderId);
      Alert.alert('Success', selectedDelivery.is_approved ? 'Rider assigned!' : 'Delivery approved and rider assigned!');
      setShowRiderModal(false);
      setSelectedDelivery(null);
      fetchDeliveries();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to assign rider';
      Alert.alert('Cannot Assign Rider', msg);
    }
  };

  const filteredDeliveries = deliveries.filter(d => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !d.is_approved;
    if (filter === 'active') return d.is_approved && ['PENDING', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status);
    if (filter === 'completed') return d.status === 'DELIVERED';
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>All Deliveries</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.filters}>
        <TouchableOpacity style={[styles.filterBtn, filter === 'all' && styles.filterActive]} onPress={() => setFilter('all')}>
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterBtn, filter === 'pending' && styles.filterActive]} onPress={() => setFilter('pending')}>
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterBtn, filter === 'active' && styles.filterActive]} onPress={() => setFilter('active')}>
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterBtn, filter === 'completed' && styles.filterActive]} onPress={() => setFilter('completed')}>
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>Completed</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.content, { marginBottom: navHeightCompensation }]}>
        {loading ? (
          <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 50 }} />
        ) : filteredDeliveries.length === 0 ? (
          <Text style={styles.emptyText}>No deliveries found</Text>
        ) : (
          filteredDeliveries.map((delivery) => (
            <TouchableOpacity 
              key={delivery.id} 
              style={styles.deliveryCard}
              onPress={() => {
                setSelectedDelivery(delivery);
                setShowDetailsModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.deliveryInfo}>
                <Text style={styles.deliveryId}>{delivery.tracking_number}</Text>
                <Text style={styles.deliveryDetail}>📤 Sender: {delivery.sender_name}</Text>
                <Text style={styles.deliveryDetail}>📞 {delivery.sender_contact}</Text>
                <Text style={styles.deliveryDetail}>📥 Receiver: {delivery.receiver_name}</Text>
                <Text style={styles.deliveryDetail}>📞 {delivery.receiver_contact}</Text>
                <Text style={styles.deliveryDetail}>🏍️ Rider: {delivery.rider_details ? `${delivery.rider_details.first_name} ${delivery.rider_details.last_name}` : 'Unassigned'}</Text>
                <Text style={styles.deliveryDetail}>📍 {delivery.delivery_address}</Text>
                <Text style={[
                  styles.deliveryStatus,
                  !delivery.is_approved && styles.pending,
                  delivery.status === 'PICKED_UP' && styles.inTransit,
                  delivery.status === 'DELIVERED' && styles.delivered
                ]}>
                  {!delivery.is_approved ? '🟡 Pending Approval' :
                   delivery.status === 'PENDING' ? '⏳ Ready to Pick Up' :
                   delivery.status === 'PICKED_UP' ? '🚚 In Transit' :
                   delivery.status === 'DELIVERED' ? '✅ Delivered' : delivery.status}
                </Text>
              </View>
              <View style={styles.deliveryRight}>
                <Text style={styles.amount}>₱{delivery.delivery_fee}</Text>
                {!delivery.is_approved && (
                  <TouchableOpacity 
                    style={styles.approveBtn}
                    onPress={() => handleApprove(delivery)}
                  >
                    <Text style={styles.approveBtnText}>✓ Approve</Text>
                  </TouchableOpacity>
                )}
                {delivery.is_approved && delivery.status !== 'DELIVERED' && delivery.status !== 'CANCELLED' && (
                  <TouchableOpacity 
                    style={styles.assignBtn}
                    onPress={async () => {
                      await Promise.all([fetchRiders(), fetchBranches()]);
                      setSelectedDelivery(delivery);
                      setShowRiderModal(true);
                    }}
                  >
                    <Text style={styles.assignBtnText}>{delivery.rider_details ? 'Change Rider' : 'Assign Rider'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={showDetailsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Delivery Details</Text>
              
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Tracking Number</Text>
                <Text style={styles.detailValue}>{selectedDelivery?.tracking_number}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[
                  styles.detailValue,
                  !selectedDelivery?.is_approved && styles.pending,
                  selectedDelivery?.status === 'PICKED_UP' && styles.inTransit,
                  selectedDelivery?.status === 'DELIVERED' && styles.delivered
                ]}>
                  {!selectedDelivery?.is_approved ? '🟡 Pending Approval' :
                   selectedDelivery?.status === 'PENDING' ? '⏳ Ready to Pick Up' :
                   selectedDelivery?.status === 'PICKED_UP' ? '🚚 In Transit' :
                   selectedDelivery?.status === 'DELIVERED' ? '✅ Delivered' : selectedDelivery?.status}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Sender</Text>
                <Text style={styles.detailValue}>{selectedDelivery?.sender_name}</Text>
                <Text style={styles.detailSubValue}>{selectedDelivery?.sender_contact}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Receiver</Text>
                <Text style={styles.detailValue}>{selectedDelivery?.receiver_name}</Text>
                <Text style={styles.detailSubValue}>{selectedDelivery?.receiver_contact}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Delivery Address</Text>
                <Text style={styles.detailValue}>{selectedDelivery?.delivery_address}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Rider</Text>
                <Text style={styles.detailValue}>
                  {selectedDelivery?.rider_details ? 
                    `${selectedDelivery.rider_details.first_name} ${selectedDelivery.rider_details.last_name}` : 
                    'Unassigned'}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Delivery Fee</Text>
                <Text style={[styles.detailValue, { color: '#4CAF50', fontWeight: 'bold' }]}>₱{selectedDelivery?.delivery_fee}</Text>
              </View>

              {selectedDelivery?.delivery_notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  <Text style={styles.detailValue}>{selectedDelivery.delivery_notes}</Text>
                </View>
              )}

              {selectedDelivery?.status === 'DELIVERED' && selectedDelivery?.proof_of_delivery && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>📸 Proof of Delivery</Text>
                  <Image 
                    source={{ uri: selectedDelivery.proof_of_delivery }} 
                    style={styles.proofImage}
                    resizeMode="contain"
                  />
                  {selectedDelivery?.recipient_name && (
                    <Text style={styles.detailSubValue}>Received by: {selectedDelivery.recipient_name}</Text>
                  )}
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.closeBtn}
              onPress={() => {
                setShowDetailsModal(false);
                setSelectedDelivery(null);
              }}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showRiderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Online Rider</Text>
              <TouchableOpacity 
                style={styles.refreshBtn}
                onPress={async () => {
                  await Promise.all([fetchRiders(), fetchBranches()]);
                }}
              >
                <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.zoneInfoBox}>
              <Text style={styles.zoneInfoText}>{riderPickerState.message}</Text>
            </View>

            {!riderPickerState.canAssign ? (
              <View style={styles.emptyRidersState}>
                <Text style={styles.emptyRidersIcon}>🏍️</Text>
                <Text style={styles.emptyRidersText}>Cannot assign rider yet</Text>
                <Text style={styles.emptyRidersSubtext}>{riderPickerState.message}</Text>
                <TouchableOpacity 
                  style={styles.retryBtn}
                  onPress={async () => {
                    await Promise.all([fetchRiders(), fetchBranches()]);
                  }}
                >
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : eligibleRiders.length === 0 ? (
              <View style={styles.emptyRidersState}>
                <Text style={styles.emptyRidersIcon}>🏍️</Text>
                <Text style={styles.emptyRidersText}>No online riders in {riderPickerState.nearestHubName}</Text>
                <Text style={styles.emptyRidersSubtext}>Please wait for a rider from that hub to come online</Text>
                <TouchableOpacity 
                  style={styles.retryBtn}
                  onPress={async () => {
                    await Promise.all([fetchRiders(), fetchBranches()]);
                  }}
                >
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={eligibleRiders}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.riderItem}
                    onPress={() => handleAssignRider(item.id)}
                  >
                    <View style={styles.riderInfo}>
                      <View style={styles.riderNameRow}>
                        <Text style={styles.riderName}>{item.first_name} {item.last_name}</Text>
                        <Text style={styles.onlineBadge}>🟢 Online</Text>
                      </View>
                      <Text style={styles.riderUsername}>@{item.username}</Text>
                      {item.branch_name ? (
                        <Text style={styles.riderHub}>📍 Hub: {item.branch_name}</Text>
                      ) : (
                        <Text style={styles.riderHubMissing}>⚠️ No Hub Assigned</Text>
                      )}
                    </View>
                    <Text style={styles.selectArrow}>›</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => {
                setShowRiderModal(false);
                setSelectedDelivery(null);
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[styles.bottomNav, { paddingBottom: 10 + navSafeInset }]}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.replace('/admin-dashboard')}>
          <Home size={20} color="#666" strokeWidth={2.2} />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.replace('/admin-deliveries')}>
          <PackageCheck size={20} color="#ED1C24" strokeWidth={2.2} />
          <Text style={[styles.navText, styles.navTextActive]}>Deliveries</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/analytics-dashboard')}>
          <LayoutDashboard size={20} color="#666" strokeWidth={2.2} />
          <Text style={styles.navText}>Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/admin-profile')}>
          <UserRound size={20} color="#666" strokeWidth={2.2} />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
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
  filters: { flexDirection: 'row', padding: 15, gap: 8, backgroundColor: '#fff' },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#f5f5f5' },
  filterActive: { backgroundColor: '#ED1C24' },
  filterText: { fontSize: 12, color: '#666', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  content: { flex: 1, padding: 15 },
  deliveryCard: {
    flexDirection: 'row',
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
  deliveryInfo: { flex: 1 },
  deliveryId: { fontSize: 15, fontWeight: 'bold', color: '#ED1C24', marginBottom: 6 },
  deliveryDetail: { fontSize: 13, color: '#666', marginBottom: 3 },
  deliveryStatus: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  pending: { color: '#FF9800' },
  inTransit: { color: '#4CAF50' },
  delivered: { color: '#2196F3' },
  deliveryRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  amount: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  arrow: { fontSize: 24, color: '#ddd' },
  approveBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  assignBtn: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  assignBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    marginTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshBtn: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  zoneInfoBox: {
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#CFE1FF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  zoneInfoText: {
    fontSize: 12,
    color: '#275DA8',
    fontWeight: '600',
  },
  riderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  riderInfo: {
    flex: 1,
  },
  riderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  onlineBadge: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  riderUsername: {
    fontSize: 13,
    color: '#999',
  },
  riderHub: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 2,
  },
  riderHubMissing: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 2,
  },
  selectArrow: {
    fontSize: 24,
    color: '#ddd',
  },
  emptyRidersState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyRidersIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyRidersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyRidersSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
  },
  cancelBtnText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  detailsModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  detailSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  detailSubValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  proofImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: '#f5f5f5',
  },
  closeBtn: {
    backgroundColor: '#ED1C24',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
  },
  closeBtnText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#ddd', elevation: 10 },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 2 },
  navText: { fontSize: 11, color: '#666' },
  navTextActive: { color: '#ED1C24', fontWeight: '600' },
});
