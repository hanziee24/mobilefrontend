import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, LayoutDashboard, PackageCheck, UserRound } from 'lucide-react-native';
import { analyticsAPI, ratingAPI } from '../services/api';

type RatingFilter = 'all' | 'high' | 'low';

interface RatingItem {
  id: number;
  rating: number;
  comment?: string;
  created_at: string;
  delivery?: number;
  customer?: number;
  rider?: number;
  delivery_tracking?: string;
  rider_name?: string;
  customer_name?: string;
}

export default function AnalyticsDashboard() {
  const insets = useSafeAreaInsets();
  const navSafeInset = Math.max(insets.bottom, 0);
  const navHeightCompensation = 72 + navSafeInset;
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [predictive, setPredictive] = useState<any>(null);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');

  useEffect(() => {
    fetchReportingData();
  }, []);

  const fetchReportingData = async () => {
    try {
      const [dashData, predData, ratingsData] = await Promise.all([
        analyticsAPI.getDashboard(),
        analyticsAPI.getPredictive(),
        ratingAPI.getRatings(),
      ]);
      setDashboard(dashData.data);
      setPredictive(predData.data);
      setRatings(Array.isArray(ratingsData.data) ? ratingsData.data : []);
    } catch (error) {
      console.error('Failed to fetch reporting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const ratingsSummary = useMemo(() => {
    const total = ratings.length;
    const high = ratings.filter((r) => r.rating >= 4).length;
    const low = ratings.filter((r) => r.rating <= 2).length;
    const average = total > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    return { total, high, low, average };
  }, [ratings]);

  const filteredRatings = useMemo(() => {
    if (ratingFilter === 'high') return ratings.filter((r) => r.rating >= 4);
    if (ratingFilter === 'low') return ratings.filter((r) => r.rating <= 2);
    return ratings;
  }, [ratingFilter, ratings]);

  const recentRatings = useMemo(() => {
    return [...filteredRatings]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  }, [filteredRatings]);

  const renderStars = (value: number) => {
    const full = Math.max(0, Math.min(5, value));
    return `${'★'.repeat(full)}${'☆'.repeat(5 - full)}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ED1C24" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Reporting</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={[styles.content, { marginBottom: navHeightCompensation }]}>
        <Text style={styles.sectionTitle}>Operations Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{dashboard?.overview?.total_deliveries ?? 0}</Text>
            <Text style={styles.statLabel}>Total Deliveries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{dashboard?.overview?.completed ?? 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>{dashboard?.overview?.in_progress ?? 0}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#f44336' }]}>{dashboard?.overview?.failed ?? 0}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Revenue</Text>
          <View style={styles.revenueRow}>
            <Text style={styles.revenueLabel}>Total Revenue</Text>
            <Text style={styles.revenueValue}>P {Number(dashboard?.revenue?.total ?? 0).toFixed(2)}</Text>
          </View>
          <View style={styles.revenueRow}>
            <Text style={styles.revenueLabel}>This Week</Text>
            <Text style={styles.revenueValue}>P {Number(dashboard?.revenue?.week ?? 0).toFixed(2)}</Text>
          </View>
          <View style={[styles.revenueRow, styles.noBorder]}>
            <Text style={styles.revenueLabel}>This Month</Text>
            <Text style={styles.revenueValue}>P {Number(dashboard?.revenue?.month ?? 0).toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Ratings And Reviews</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{ratingsSummary.total}</Text>
            <Text style={styles.statLabel}>Total Reviews</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{ratingsSummary.average.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Average Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{ratingsSummary.high}</Text>
            <Text style={styles.statLabel}>High Rated (4-5)</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#f44336' }]}>{ratingsSummary.low}</Text>
            <Text style={styles.statLabel}>Low Rated (1-2)</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, ratingFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setRatingFilter('all')}
          >
            <Text style={[styles.filterText, ratingFilter === 'all' && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, ratingFilter === 'high' && styles.filterButtonActive]}
            onPress={() => setRatingFilter('high')}
          >
            <Text style={[styles.filterText, ratingFilter === 'high' && styles.filterTextActive]}>High</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, ratingFilter === 'low' && styles.filterButtonActive]}
            onPress={() => setRatingFilter('low')}
          >
            <Text style={[styles.filterText, ratingFilter === 'low' && styles.filterTextActive]}>Low</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Reviews</Text>
          {recentRatings.length > 0 ? (
            recentRatings.map((rating) => (
              <View key={rating.id} style={styles.ratingRow}>
                <View style={styles.ratingHeader}>
                  <Text style={styles.stars}>{renderStars(rating.rating)}</Text>
                  <Text style={styles.ratingDate}>{new Date(rating.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.ratingMeta}>Order: {rating.delivery_tracking || `#${rating.delivery ?? '-'}`}</Text>
                <Text style={styles.ratingMeta}>Customer: {rating.customer_name || `User #${rating.customer ?? '-'}`}</Text>
                <Text style={styles.ratingMeta}>Rider: {rating.rider_name || `Rider #${rating.rider ?? '-'}`}</Text>
                {rating.comment ? <Text style={styles.comment}>Comment: {rating.comment}</Text> : null}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No ratings found for this filter.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Predictive Analytics</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Forecast</Text>
          <View style={styles.forecastBox}>
            <Text style={styles.forecastLabel}>Next Week Deliveries</Text>
            <Text style={styles.forecastNumber}>{predictive?.forecast?.next_week_deliveries ?? 0}</Text>
            <Text style={styles.growthRate}>
              Growth: {Number(predictive?.forecast?.growth_rate ?? 0) > 0 ? '+' : ''}
              {Number(predictive?.forecast?.growth_rate ?? 0)}%
            </Text>
          </View>
          <View style={styles.forecastBox}>
            <Text style={styles.forecastLabel}>Predicted Revenue</Text>
            <Text style={styles.forecastNumber}>P {Number(predictive?.forecast?.predicted_revenue ?? 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Peak Hours</Text>
          {(predictive?.insights?.peak_hours || []).map((item: any, index: number) => (
            <View key={index} style={styles.peakHourRow}>
              <Text style={styles.peakHourLabel}>{item.hour}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${item.percentage}%` }]} />
              </View>
              <Text style={styles.peakHourPercent}>{item.percentage}%</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recommendations</Text>
          {(predictive?.recommendations || []).map((rec: string, index: number) => (
            <View key={index} style={styles.recommendationRow}>
              <Text style={styles.bullet}>-</Text>
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: 10 + navSafeInset }]}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.replace('/admin-dashboard')}>
          <Home size={20} color="#666" strokeWidth={2.2} />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/admin-deliveries')}>
          <PackageCheck size={20} color="#666" strokeWidth={2.2} />
          <Text style={styles.navText}>Deliveries</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.replace('/analytics-dashboard')}>
          <LayoutDashboard size={20} color="#ED1C24" strokeWidth={2.2} />
          <Text style={[styles.navText, styles.navTextActive]}>Reports</Text>
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
  center: { justifyContent: 'center', alignItems: 'center' },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ED1C24',
    marginTop: 10,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ED1C24',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  revenueLabel: {
    fontSize: 14,
    color: '#666',
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#ED1C24',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  ratingRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stars: {
    fontSize: 15,
    color: '#ED1C24',
  },
  ratingDate: {
    fontSize: 11,
    color: '#999',
  },
  ratingMeta: {
    fontSize: 12,
    color: '#555',
    marginBottom: 2,
  },
  comment: {
    fontSize: 13,
    color: '#333',
    marginTop: 6,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
  },
  forecastBox: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  forecastLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  forecastNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ED1C24',
  },
  growthRate: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 5,
  },
  peakHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  peakHourLabel: {
    fontSize: 13,
    color: '#666',
    width: 80,
  },
  progressBar: {
    flex: 1,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  peakHourPercent: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    width: 40,
    textAlign: 'right',
  },
  recommendationRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  bullet: {
    fontSize: 16,
    color: '#ED1C24',
    marginRight: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#ddd', elevation: 10 },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 2 },
  navText: { fontSize: 11, color: '#666' },
  navTextActive: { color: '#ED1C24', fontWeight: '600' },
});
