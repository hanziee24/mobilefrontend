import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { ratingAPI } from '../services/api';

interface RiderStats {
  rider_id: number;
  rider_name: string;
  avg_rating: number;
  total_ratings: number;
  low_ratings_count: number;
  recent_ratings: {
    rating: number;
    comment: string;
    created_at: string;
    tracking_number: string;
  }[];
}

export default function AdminLowRatedRiders() {
  const [riders, setRiders] = useState<RiderStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRider, setExpandedRider] = useState<number | null>(null);

  useEffect(() => {
    fetchLowRatedRiders();
  }, []);

  const fetchLowRatedRiders = async () => {
    try {
      const response = await ratingAPI.getLowRatedRiders();
      setRiders(response.data);
    } catch (error) {
      console.log('Error fetching low-rated riders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (riderId: number, action: string) => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} this rider?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert('Success', `Rider ${action} successfully`);
          },
        },
      ]
    );
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Text key={i} style={styles.starIcon}>
        {i < Math.round(rating) ? '⭐' : '☆'}
      </Text>
    ));

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ED1C24" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Low-Rated Riders</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.alertBanner}>
        <Text style={styles.alertIcon}>⚠️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.alertTitle}>{riders.length} Riders Need Review</Text>
          <Text style={styles.alertText}>These riders have received low ratings and may need performance coaching</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {riders.map((rider) => (
          <View key={rider.rider_id} style={styles.riderCard}>
            <TouchableOpacity
              style={styles.riderHeader}
              onPress={() => setExpandedRider(expandedRider === rider.rider_id ? null : rider.rider_id)}
            >
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>🏍️ {rider.rider_name}</Text>
                <View style={styles.ratingRow}>
                  <View style={styles.stars}>{renderStars(rider.avg_rating)}</View>
                  <Text style={styles.avgRating}>{rider.avg_rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.statsText}>
                  {rider.total_ratings} total • {rider.low_ratings_count} low ratings
                </Text>
              </View>
              <Text style={styles.expandIcon}>{expandedRider === rider.rider_id ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {expandedRider === rider.rider_id && (
              <View style={styles.expandedContent}>
                <Text style={styles.sectionTitle}>Recent Reviews:</Text>
                {rider.recent_ratings.map((rating, idx) => (
                  <View key={idx} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.stars}>{renderStars(rating.rating)}</View>
                      <Text style={styles.reviewDate}>{new Date(rating.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.reviewOrder}>Order: {rating.tracking_number}</Text>
                    {rating.comment && <Text style={styles.reviewComment}>&quot;{rating.comment}&quot;</Text>}
                  </View>
                ))}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.warnBtn]}
                    onPress={() => handleAction(rider.rider_id, 'send warning to')}
                  >
                    <Text style={styles.actionBtnText}>⚠️ Send Warning</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.suspendBtn]}
                    onPress={() => handleAction(rider.rider_id, 'suspend')}
                  >
                    <Text style={styles.actionBtnText}>🚫 Suspend</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}

        {riders.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>All riders performing well!</Text>
            <Text style={styles.emptySubtext}>No low-rated riders at this time</Text>
          </View>
        )}
      </ScrollView>
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
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 3,
    borderBottomColor: '#ED1C24',
  },
  backButton: { fontSize: 28, color: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    padding: 15,
    margin: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    gap: 12,
  },
  alertIcon: { fontSize: 24 },
  alertTitle: { fontSize: 14, fontWeight: 'bold', color: '#856404', marginBottom: 4 },
  alertText: { fontSize: 12, color: '#856404' },
  content: { flex: 1, paddingHorizontal: 15 },
  riderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  riderHeader: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  stars: { flexDirection: 'row', gap: 2 },
  starIcon: { fontSize: 14 },
  avgRating: { fontSize: 14, fontWeight: 'bold', color: '#ED1C24' },
  statsText: { fontSize: 12, color: '#666' },
  expandIcon: { fontSize: 16, color: '#999', marginLeft: 10 },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 15,
    backgroundColor: '#fafafa',
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  reviewItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewDate: { fontSize: 11, color: '#999' },
  reviewOrder: { fontSize: 12, color: '#666', marginBottom: 4 },
  reviewComment: { fontSize: 12, color: '#444', fontStyle: 'italic' },
  actionButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  warnBtn: { backgroundColor: '#FF9800' },
  suspendBtn: { backgroundColor: '#DC3545' },
  actionBtnText: { color: '#fff', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  emptySubtext: { fontSize: 12, color: '#777' },
});
