import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { deliveryAPI } from '../services/api';

interface ScanHistory {
  id: number;
  tracking_number: string;
  scan_type: 'PICKUP' | 'DELIVERY' | 'TRACKING';
  scanned_by: string;
  scanned_at: string;
  location?: string;
  status_before: string;
  status_after: string;
}

export default function QRScanHistory() {
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pickup' | 'delivery'>('all');

  useEffect(() => {
    fetchScanHistory();
  }, []);

  const fetchScanHistory = async () => {
    try {
      // This would be a real API call in production
      // For now, we'll generate mock data from deliveries
      const response = await deliveryAPI.getAllDeliveries();
      const mockHistory: ScanHistory[] = [];
      
      response.data.forEach((delivery: any, index: number) => {
        // Add pickup scan if picked up
        if (delivery.status !== 'PENDING') {
          mockHistory.push({
            id: index * 2,
            tracking_number: delivery.tracking_number,
            scan_type: 'PICKUP',
            scanned_by: delivery.rider_details ? 
              `${delivery.rider_details.first_name} ${delivery.rider_details.last_name}` : 
              'Unknown',
            scanned_at: delivery.created_at,
            status_before: 'PENDING',
            status_after: 'PICKED_UP',
          });
        }
        
        // Add delivery scan if delivered
        if (delivery.status === 'DELIVERED') {
          mockHistory.push({
            id: index * 2 + 1,
            tracking_number: delivery.tracking_number,
            scan_type: 'DELIVERY',
            scanned_by: delivery.rider_details ? 
              `${delivery.rider_details.first_name} ${delivery.rider_details.last_name}` : 
              'Unknown',
            scanned_at: delivery.updated_at,
            status_before: 'IN_TRANSIT',
            status_after: 'DELIVERED',
          });
        }
      });
      
      // Sort by date (newest first)
      mockHistory.sort((a, b) => 
        new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
      );
      
      setHistory(mockHistory);
    } catch (error) {
      console.log('Error fetching scan history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(h => {
    if (filter === 'all') return true;
    if (filter === 'pickup') return h.scan_type === 'PICKUP';
    if (filter === 'delivery') return h.scan_type === 'DELIVERY';
    return true;
  });

  const getScanIcon = (type: string) => {
    switch (type) {
      case 'PICKUP': return '📦';
      case 'DELIVERY': return '✅';
      case 'TRACKING': return '📍';
      default: return '📱';
    }
  };

  const getScanColor = (type: string) => {
    switch (type) {
      case 'PICKUP': return '#2196F3';
      case 'DELIVERY': return '#4CAF50';
      case 'TRACKING': return '#FF9800';
      default: return '#999';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan History</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{history.length}</Text>
          <Text style={styles.statLabel}>Total Scans</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {history.filter(h => h.scan_type === 'PICKUP').length}
          </Text>
          <Text style={styles.statLabel}>Pickups</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {history.filter(h => h.scan_type === 'DELIVERY').length}
          </Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterBtn, filter === 'pickup' && styles.filterBtnActive]}
          onPress={() => setFilter('pickup')}
        >
          <Text style={[styles.filterText, filter === 'pickup' && styles.filterTextActive]}>
            📦 Pickups
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterBtn, filter === 'delivery' && styles.filterBtnActive]}
          onPress={() => setFilter('delivery')}
        >
          <Text style={[styles.filterText, filter === 'delivery' && styles.filterTextActive]}>
            ✅ Deliveries
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 50 }} />
        ) : filteredHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📱</Text>
            <Text style={styles.emptyText}>No scan history</Text>
            <Text style={styles.emptySubtext}>QR code scans will appear here</Text>
          </View>
        ) : (
          filteredHistory.map((scan) => (
            <View key={scan.id} style={styles.scanCard}>
              <View style={styles.scanHeader}>
                <View style={styles.scanTypeContainer}>
                  <Text style={styles.scanIcon}>{getScanIcon(scan.scan_type)}</Text>
                  <View>
                    <Text style={[styles.scanType, { color: getScanColor(scan.scan_type) }]}>
                      {scan.scan_type}
                    </Text>
                    <Text style={styles.scanTime}>{formatDate(scan.scanned_at)}</Text>
                  </View>
                </View>
                <Text style={styles.trackingNum}>{scan.tracking_number}</Text>
              </View>

              <View style={styles.scanDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Scanned by:</Text>
                  <Text style={styles.detailValue}>{scan.scanned_by}</Text>
                </View>
                
                <View style={styles.statusFlow}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{scan.status_before}</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                  <View style={[styles.statusBadge, styles.statusBadgeActive]}>
                    <Text style={[styles.statusText, styles.statusTextActive]}>
                      {scan.status_after}
                    </Text>
                  </View>
                </View>

                {scan.location && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>📍 Location:</Text>
                    <Text style={styles.detailValue}>{scan.location}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: { fontSize: 28, color: '#333' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#ED1C24' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    gap: 8,
    marginBottom: 10,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#ED1C24' },
  filterText: { fontSize: 12, color: '#666', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  content: { flex: 1, paddingHorizontal: 15 },
  scanCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scanTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanIcon: { fontSize: 24 },
  scanType: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  scanTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  trackingNum: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ED1C24',
  },
  scanDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  statusFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statusBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#4CAF50',
  },
  arrow: {
    fontSize: 16,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: { fontSize: 64, marginBottom: 15 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#999' },
});
