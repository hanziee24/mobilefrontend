import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { deliveryAPI, API_URL } from '../services/api';
import { ArrowLeft, ChevronDown, ChevronRight, House, Package, Package2, UserRound } from 'lucide-react-native';

interface Delivery {
  id: number;
  tracking_number: string;
  status: string;
  delivery_fee: string;
  created_at: string;
  updated_at: string;
  has_rating: boolean;
  sender_name: string;
  sender_address: string;
  sender_contact: string;
  receiver_name: string;
  receiver_address: string;
  receiver_contact: string;
  package_details: string;
  pickup_address: string;
  delivery_address: string;
  proof_of_delivery?: string;
  package_photo?: string;
  estimated_time?: string;
  rider_details?: {
    id: number;
    first_name: string;
    last_name: string;
    phone: string;
  };
  delivery_time_slot?: string;
  scheduled_date?: string;
  is_fragile?: boolean;
  special_instructions?: string;
}

export default function OrderHistory() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeNav, setActiveNav] = useState('orders');
  const [orders, setOrders] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (tab && ['home', 'orders', 'profile'].includes(tab)) {
      setActiveNav(tab);
    }
  }, [tab]);

  const fetchOrders = async () => {
    try {
      const response = await deliveryAPI.getAllDeliveries();
      setOrders(response.data);
    } catch (error) {
      console.log('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return '#4CAF50';
      case 'CANCELLED': return '#999';
      case 'FAILED': return '#FF9800';
      case 'PENDING': return '#2196F3';
      case 'PICKED_UP': return '#9C27B0';
      case 'IN_TRANSIT': return '#FF5722';
      case 'OUT_FOR_DELIVERY': return '#FF9800';
      default: return '#666';
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.title}>Order History</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 110 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 50 }} />
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={56} color="#ED1C24" strokeWidth={1.8} />
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        ) : (
          orders.map((order) => {
            const isExpanded = expandedId === order.id;
            return (
              <View key={order.id} style={styles.orderCard}>
                <TouchableOpacity onPress={() => toggleExpand(order.id)}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderHeaderLeft}>
                      <Text style={styles.orderId}>{order.tracking_number}</Text>
                      <Text style={styles.date}>{new Date(order.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.orderHeaderRight}>
                      <Text style={[styles.status, { color: getStatusColor(order.status) }]}>{order.status.replace('_', ' ')}</Text>
                      {isExpanded ? (
                        <ChevronDown size={14} color="#999" strokeWidth={2.2} />
                      ) : (
                        <ChevronRight size={14} color="#999" strokeWidth={2.2} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.detailsContainer}>
                    <View style={styles.divider} />

                    {/* Sender Details */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Sender Information</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Name:</Text>
                        <Text style={styles.detailValue}>{order.sender_name}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Contact:</Text>
                        <Text style={styles.detailValue}>{order.sender_contact}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Address:</Text>
                        <Text style={styles.detailValue}>{order.sender_address}</Text>
                      </View>
                    </View>

                    {/* Receiver Details */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Receiver Information</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Name:</Text>
                        <Text style={styles.detailValue}>{order.receiver_name}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Contact:</Text>
                        <Text style={styles.detailValue}>{order.receiver_contact}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Address:</Text>
                        <Text style={styles.detailValue}>{order.receiver_address}</Text>
                      </View>
                    </View>

                    {/* Package Details */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Package Details</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Details:</Text>
                        <Text style={styles.detailValue}>{order.package_details}</Text>
                      </View>
                      {order.is_fragile && (
                        <View style={styles.fragileTag}>
                          <Text style={styles.fragileText}>FRAGILE</Text>
                        </View>
                      )}
                      {order.special_instructions && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Instructions:</Text>
                          <Text style={styles.detailValue}>{order.special_instructions}</Text>
                        </View>
                      )}
                      {order.package_photo && (
                        <TouchableOpacity onPress={() => {
                          const uri = order.package_photo!.startsWith('http')
                            ? order.package_photo!
                            : `${API_URL.replace('/api', '')}/media/${order.package_photo}`;
                          setProofImage(uri);
                        }}>
                          <Image
                            source={{ uri: order.package_photo.startsWith('http')
                              ? order.package_photo
                              : `${API_URL.replace('/api', '')}/media/${order.package_photo}` }}
                            style={styles.proofThumb}
                          />
                          <Text style={styles.proofHint}>Package photo — tap to enlarge</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Rider Details */}
                    {order.rider_details && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Rider Information</Text>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Name:</Text>
                          <Text style={styles.detailValue}>
                            {order.rider_details.first_name} {order.rider_details.last_name}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Contact:</Text>
                          <Text style={styles.detailValue}>{order.rider_details.phone}</Text>
                        </View>
                      </View>
                    )}

                    {/* Time Slot */}
                    {order.delivery_time_slot && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Delivery Schedule</Text>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Time Slot:</Text>
                          <Text style={styles.detailValue}>{order.delivery_time_slot}</Text>
                        </View>
                        {order.scheduled_date && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Date:</Text>
                            <Text style={styles.detailValue}>
                              {new Date(order.scheduled_date).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Proof of Delivery */}
                    {order.status === 'DELIVERED' && order.proof_of_delivery && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Proof of Delivery</Text>
                        <TouchableOpacity onPress={() => {
                          const uri = order.proof_of_delivery!.startsWith('http')
                            ? order.proof_of_delivery!
                            : `${API_URL.replace('/api', '')}/media/${order.proof_of_delivery}`;
                          setProofImage(uri);
                        }}>
                          <Image
                            source={{ uri: order.proof_of_delivery.startsWith('http')
                              ? order.proof_of_delivery
                              : `${API_URL.replace('/api', '')}/media/${order.proof_of_delivery}` }}
                            style={styles.proofThumb}
                          />
                          <Text style={styles.proofHint}>Tap to view full image</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Dates */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Timeline</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Created:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(order.created_at).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Last Updated:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(order.updated_at).toLocaleString()}
                        </Text>
                      </View>
                      {order.estimated_time && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>ETA:</Text>
                          <Text style={[styles.detailValue, { color: '#ED1C24', fontWeight: '600' }]}>
                            {order.estimated_time}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.divider} />
                  </View>
                )}

                <View style={styles.orderFooter}>
                  <Text style={styles.amount}>PHP {order.delivery_fee}</Text>
                  {order.status === 'DELIVERED' && !order.has_rating && (
                    <TouchableOpacity style={styles.rateButton} onPress={() => router.push('/rate-rider')}>
                      <Text style={styles.rateText}>Rate</Text>
                    </TouchableOpacity>
                  )}
                  {order.has_rating && (
                    <Text style={styles.ratedText}>Rated</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Full screen proof image modal */}
      <Modal visible={!!proofImage} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setProofImage(null)}>
          <Image source={{ uri: proofImage! }} style={styles.fullImage} resizeMode="contain" />
          <Text style={styles.modalClose}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => { setActiveNav('home'); router.replace('/customer-dashboard?tab=home'); }}>
          <View style={styles.navIcon}>
            <House size={20} color={activeNav === 'home' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          </View>
          <Text style={[styles.navText, activeNav === 'home' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => setActiveNav('orders')}>
          <View style={styles.navIcon}>
            <Package2 size={20} color={activeNav === 'orders' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          </View>
          <Text style={[styles.navText, activeNav === 'orders' && styles.navTextActive]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => { setActiveNav('profile'); router.push('/customer-profile'); }}>
          <View style={styles.navIcon}>
            <UserRound size={20} color={activeNav === 'profile' ? '#ED1C24' : '#666'} strokeWidth={2.2} />
          </View>
          <Text style={[styles.navText, activeNav === 'profile' && styles.navTextActive]}>Profile</Text>
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
  content: { flex: 1, padding: 15 },
  orderCard: {
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
  orderHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderHeaderRight: {
    alignItems: 'flex-end',
  },
  orderId: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333',
    marginBottom: 4,
  },
  status: { 
    fontSize: 13, 
    fontWeight: '600',
    marginBottom: 4,
  },
  expandIcon: {
    fontSize: 12,
    color: '#999',
  },
  cancelled: { color: '#999' },
  date: { 
    fontSize: 12, 
    color: '#999',
  },
  detailsContainer: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ED1C24',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    width: 80,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  fragileTag: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  fragileText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF9800',
  },
  orderFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginTop: 8,
  },
  amount: { fontSize: 18, fontWeight: 'bold', color: '#ED1C24' },
  rateButton: {
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rateText: { fontSize: 14, color: '#ED1C24', fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  ratedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  proofThumb: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  proofHint: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
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
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    elevation: 10,
  },
  navButton: { flex: 1, alignItems: 'center', paddingVertical: 5 },
  navIcon: { marginBottom: 4, height: 22, justifyContent: 'center', alignItems: 'center' },
  navText: { fontSize: 12, color: '#666' },
  navTextActive: { color: '#ED1C24', fontWeight: '600' },
});

