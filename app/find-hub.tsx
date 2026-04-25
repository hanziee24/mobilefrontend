import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { authAPI } from '../services/api';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';

interface Branch {
  id: number;
  name: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  distance_km?: number;
}

export default function FindHub() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const res = await authAPI.getNearestHub(loc.coords.latitude, loc.coords.longitude);
          setBranches(res.data);
        } else {
          const res = await authAPI.getBranches();
          setBranches(res.data);
        }
      } catch {
        Alert.alert('Error', 'Failed to load hubs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openMap = (branch: Branch) => {
    if (branch.latitude && branch.longitude) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find a Hub</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={branches}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 15, gap: 12 }}
          ListEmptyComponent={<Text style={styles.empty}>No hubs available</Text>}
          renderItem={({ item, index }) => (
            <View style={[styles.card, index === 0 && item.distance_km !== undefined && styles.cardNearest]}>
              <View style={styles.cardHeader}>
                <MapPin size={18} color={index === 0 && item.distance_km !== undefined ? '#1565C0' : '#ED1C24'} strokeWidth={2.2} />
                <Text style={styles.branchName}>{item.name}</Text>
                {index === 0 && item.distance_km !== undefined && (
                  <View style={styles.nearestBadge}><Text style={styles.nearestBadgeText}>Nearest</Text></View>
                )}
              </View>
              <Text style={styles.address}>{item.address}</Text>
              {item.distance_km !== undefined && (
                <Text style={styles.distanceText}>{item.distance_km} km away</Text>
              )}
              <TouchableOpacity style={styles.mapBtn} onPress={() => openMap(item)}>
                <Text style={styles.mapBtnText}>Open in Maps</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  branchName: { fontSize: 16, fontWeight: '700', color: '#333' },
  address: { fontSize: 13, color: '#666', marginBottom: 12 },
  mapBtn: { backgroundColor: '#ED1C24', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  mapBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  cardNearest: { borderWidth: 2, borderColor: '#1565C0' },
  nearestBadge: { backgroundColor: '#1565C0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 'auto' },
  nearestBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  distanceText: { fontSize: 12, color: '#1565C0', fontWeight: '600', marginBottom: 8 },
});
