import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { deliveryAPI } from '../services/api';

export default function PerformanceStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await deliveryAPI.getRiderStats();
      setStats(response.data);
    } catch (error) {
      console.log('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.title}>Performance Stats</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.ratingCard}>
          <Text style={styles.ratingLabel}>Overall Rating</Text>
          <Text style={styles.ratingValue}>{stats?.average_rating?.toFixed(1) || '0.0'} ⭐</Text>
          <Text style={styles.ratingSubtext}>Based on {stats?.total_completed || 0} deliveries</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.total_completed || 0}</Text>
            <Text style={styles.statLabel}>Total Deliveries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.active_count || 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats?.on_time_rate || 0}%</Text>
            <Text style={styles.statLabel}>On-Time Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>₱{stats?.month_earnings?.toFixed(0) || 0}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Earnings Breakdown</Text>
          <View style={styles.perfItem}>
            <Text style={styles.perfLabel}>Today</Text>
            <Text style={styles.perfValue}>₱{stats?.today_earnings?.toFixed(2) || '0.00'} ({stats?.today_count || 0} deliveries)</Text>
          </View>
          <View style={styles.perfItem}>
            <Text style={styles.perfLabel}>This Week</Text>
            <Text style={styles.perfValue}>₱{stats?.week_earnings?.toFixed(2) || '0.00'} ({stats?.week_count || 0} deliveries)</Text>
          </View>
          <View style={styles.perfItem}>
            <Text style={styles.perfLabel}>This Month</Text>
            <Text style={styles.perfValue}>₱{stats?.month_earnings?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: { fontSize: 28, color: '#333' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  content: { flex: 1, padding: 15 },
  ratingCard: {
    backgroundColor: '#ED1C24',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  ratingLabel: { fontSize: 14, color: '#fff', opacity: 0.9 },
  ratingValue: { fontSize: 48, fontWeight: 'bold', color: '#fff', marginVertical: 10 },
  ratingSubtext: { fontSize: 13, color: '#fff', opacity: 0.8 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#ED1C24', marginBottom: 5 },
  statLabel: { fontSize: 12, color: '#666', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  perfItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  perfLabel: { fontSize: 15, color: '#666' },
  perfValue: { fontSize: 15, fontWeight: '600', color: '#333' },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  stars: { fontSize: 14, width: 80 },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingFill: { height: '100%', backgroundColor: '#FFD700' },
  ratingCount: { fontSize: 13, color: '#666', width: 30, textAlign: 'right' },
});
