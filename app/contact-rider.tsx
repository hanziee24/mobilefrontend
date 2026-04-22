import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { deliveryAPI } from '../services/api';

export default function ContactRider() {
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDelivery();
  }, []);

  const fetchDelivery = async () => {
    try {
      const response = await deliveryAPI.getActiveDeliveries();
      const activeDelivery = response.data.find((d: any) => 
        ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(d.status)
      );
      if (activeDelivery) {
        setDelivery(activeDelivery);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (delivery?.rider_details?.phone) {
      Linking.openURL(`tel:${delivery.rider_details.phone}`);
    }
  };

  const handleMessage = () => {
    if (delivery?.rider_details?.phone) {
      Linking.openURL(`sms:${delivery.rider_details.phone}`);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ED1C24" />
      </View>
    );
  }

  if (!delivery || !delivery.rider_details) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Contact Rider</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.emptyText}>No active delivery with rider</Text>
        </View>
      </View>
    );
  }

  const rider = delivery.rider_details;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Contact Rider</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.riderCard}>
          <View style={styles.riderAvatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text style={styles.riderName}>{rider.first_name} {rider.last_name}</Text>
          <Text style={styles.riderRating}>🏍️ {rider.username}</Text>
          <Text style={styles.trackingId}>{delivery.tracking_number}</Text>
        </View>

        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push({ pathname: '/chat', params: { deliveryId: delivery.id, trackingNumber: delivery.tracking_number } } as any)}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>💬</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>In-App Chat</Text>
              <Text style={styles.actionSubtitle}>Chat directly with rider</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📞</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Call Rider</Text>
              <Text style={styles.actionSubtitle}>{rider.phone}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>💬</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Send Message</Text>
              <Text style={styles.actionSubtitle}>SMS to rider</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Contact Guidelines</Text>
          <Text style={styles.infoText}>• Be respectful and courteous</Text>
          <Text style={styles.infoText}>• Provide clear delivery instructions</Text>
          <Text style={styles.infoText}>• Contact only for delivery-related matters</Text>
        </View>
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
  riderCard: {
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
  riderAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 40 },
  riderName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  riderRating: { fontSize: 14, color: '#666', marginBottom: 8 },
  trackingId: { fontSize: 13, color: '#999' },
  emptyText: { fontSize: 16, color: '#999' },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionIconText: { fontSize: 24 },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  actionSubtitle: { fontSize: 13, color: '#666' },
  arrow: { fontSize: 24, color: '#ddd' },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 15,
  },
  infoTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 10 },
  infoText: { fontSize: 13, color: '#666', marginBottom: 5 },
});
