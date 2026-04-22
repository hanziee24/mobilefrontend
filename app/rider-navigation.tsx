import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { deliveryAPI } from '../services/api';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { locationService } from '../services/locationService';
import {
  ArrowLeft,
  Check,
  MapPinned,
  MessageSquare,
  Phone,
  Truck,
  UserRound,
} from 'lucide-react-native';

type RoutePoint = { latitude: number; longitude: number };

export default function RiderNavigation() {
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [riderLocation, setRiderLocation] = useState<any>(null);
  const [pickupCoords, setPickupCoords] = useState<any>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
  const [isTrackingActive, setIsTrackingActive] = useState(false);

  useEffect(() => {
    fetchDelivery();
    checkTrackingStatus();
  }, []);

  useEffect(() => {
    if (delivery) {
      getCurrentLocation();
      startBackgroundTracking();
      const interval = setInterval(getCurrentLocation, 10000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [delivery]);

  useEffect(() => {
    if (deliveryCoords && riderLocation) {
      fetchRoadRoute(riderLocation, deliveryCoords);
    } else if (pickupCoords && deliveryCoords) {
      fetchRoadRoute(pickupCoords, deliveryCoords);
    } else {
      setRouteCoordinates([]);
    }
  }, [riderLocation, pickupCoords, deliveryCoords]);

  const parseAddressWithCoords = (rawAddress: string) => {
    const [addressPart, coordsPart] = (rawAddress || '').split('|');
    const address = (addressPart || '').trim();

    if (!coordsPart) {
      return { address, coords: null as { latitude: number; longitude: number } | null };
    }

    const [lat, lng] = coordsPart.split(',').map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { address, coords: null as { latitude: number; longitude: number } | null };
    }

    return {
      address,
      coords: { latitude: lat, longitude: lng },
    };
  };

  const geocodeAddress = async (address: string) => {
    if (!address) return null;
    try {
      const results = await Location.geocodeAsync(address);
      if (!results?.length) return null;
      return {
        latitude: results[0].latitude,
        longitude: results[0].longitude,
      };
    } catch (error) {
      console.log('Geocode failed for address:', address);
      return null;
    }
  };

  const decodePolyline = (encoded: string): RoutePoint[] => {
    const points: RoutePoint[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b: number;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }

    return points;
  };

  const fetchRoadRoute = async (origin: RoutePoint, destination: RoutePoint) => {
    try {
      const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

      if (GOOGLE_API_KEY) {
        const googleUrl =
          `https://maps.googleapis.com/maps/api/directions/json?` +
          `origin=${origin.latitude},${origin.longitude}&` +
          `destination=${destination.latitude},${destination.longitude}&` +
          `mode=driving&key=${GOOGLE_API_KEY}`;

        const googleRes = await fetch(googleUrl);
        const googleData = await googleRes.json();

        if (googleData?.status === 'OK' && googleData.routes?.length > 0) {
          const encoded = googleData.routes[0]?.overview_polyline?.points;
          if (encoded) {
            const decoded = decodePolyline(encoded);
            if (decoded.length > 1) {
              setRouteCoordinates(decoded);
              return;
            }
          }
        }
      }

      // Fallback road route provider if Google key is unavailable/limited.
      const osrmUrl =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
        `?overview=full&geometries=geojson`;
      const osrmRes = await fetch(osrmUrl);
      const osrmData = await osrmRes.json();

      if (osrmData?.routes?.length > 0) {
        const coords: RoutePoint[] = osrmData.routes[0].geometry.coordinates.map((c: number[]) => ({
          latitude: c[1],
          longitude: c[0],
        }));
        if (coords.length > 1) {
          setRouteCoordinates(coords);
          return;
        }
      }

      setRouteCoordinates([origin, destination]);
    } catch (error) {
      console.log('Road route fetch failed');
      setRouteCoordinates([origin, destination]);
    }
  };

  const fetchDelivery = async () => {
    try {
      const deliveries = await deliveryAPI.getActiveDeliveries();
      const activeDelivery = deliveries.data.find((d: any) => d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT' || d.status === 'OUT_FOR_DELIVERY');
      if (activeDelivery) {
        setDelivery(activeDelivery);

        const pickup = parseAddressWithCoords(activeDelivery.pickup_address);
        const dropoff = parseAddressWithCoords(activeDelivery.delivery_address);

        const pickupResolved =
          pickup.coords ||
          (activeDelivery.sender_latitude && activeDelivery.sender_longitude
            ? { latitude: Number(activeDelivery.sender_latitude), longitude: Number(activeDelivery.sender_longitude) }
            : await geocodeAddress(pickup.address));
        const dropoffResolved =
          dropoff.coords ||
          (activeDelivery.delivery_latitude && activeDelivery.delivery_longitude
            ? { latitude: Number(activeDelivery.delivery_latitude), longitude: Number(activeDelivery.delivery_longitude) }
            : await geocodeAddress(dropoff.address));

        setPickupCoords(pickupResolved);
        setDeliveryCoords(dropoffResolved);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load delivery');
    } finally {
      setLoading(false);
    }
  };

  const checkTrackingStatus = async () => {
    const tracking = await locationService.isTracking();
    setIsTrackingActive(tracking);
  };

  const startBackgroundTracking = async () => {
    try {
      await locationService.startTracking();
      setIsTrackingActive(true);
    } catch (error: any) {
      console.log('Background tracking not started:', error.message);
    }
  };

  const stopBackgroundTracking = async () => {
    try {
      await locationService.stopTracking();
      setIsTrackingActive(false);
      Alert.alert('Success', 'Background tracking stopped');
    } catch (error) {
      Alert.alert('Error', 'Failed to stop tracking');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setRiderLocation(coords);

      if (delivery) {
        try {
          await deliveryAPI.updateRiderLocation(coords.latitude, coords.longitude);
        } catch {
          console.log('Auto location update failed');
        }
      }
    } catch {
      console.log('Failed to get location');
    }
  };

  const openMaps = () => {
    if (!delivery) return;
    const address = delivery.delivery_address.split('|')[0];
    const destination = deliveryCoords
      ? `${deliveryCoords.latitude},${deliveryCoords.longitude}`
      : address;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    Linking.openURL(url);
  };

  const handleComplete = async () => {
    if (!delivery) return;
    router.push({ pathname: '/rider-pos', params: { id: String(delivery.id), next: 'proof' } } as any);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ED1C24" />
      </View>
    );
  }

  if (!delivery) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#333" strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.title}>Navigation</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.emptyText}>No active delivery</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.title}>Navigation</Text>
        <View style={{ width: 30 }} />
      </View>

      {pickupCoords && deliveryCoords ? (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: (pickupCoords.latitude + deliveryCoords.latitude) / 2,
            longitude: (pickupCoords.longitude + deliveryCoords.longitude) / 2,
            latitudeDelta: Math.abs(pickupCoords.latitude - deliveryCoords.latitude) * 2 || 0.05,
            longitudeDelta: Math.abs(pickupCoords.longitude - deliveryCoords.longitude) * 2 || 0.05,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          <Marker
            coordinate={deliveryCoords}
            title="Delivery Location (Receiver)"
            description={`${delivery.receiver_name} - ${delivery.delivery_address.split('|')[0]}`}
            pinColor="red"
          />
          <Polyline
            coordinates={
              routeCoordinates.length > 1
                ? routeCoordinates
                : riderLocation
                  ? [riderLocation, deliveryCoords]
                  : [pickupCoords, deliveryCoords]
            }
            strokeColor="#ED1C24"
            strokeWidth={4}
          />
        </MapView>
      ) : deliveryCoords && riderLocation ? (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: (riderLocation.latitude + deliveryCoords.latitude) / 2,
            longitude: (riderLocation.longitude + deliveryCoords.longitude) / 2,
            latitudeDelta: Math.abs(riderLocation.latitude - deliveryCoords.latitude) * 2 || 0.05,
            longitudeDelta: Math.abs(riderLocation.longitude - deliveryCoords.longitude) * 2 || 0.05,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          <Marker
            coordinate={deliveryCoords}
            title="Delivery Location (Receiver)"
            description={`${delivery.receiver_name} - ${delivery.delivery_address.split('|')[0]}`}
            pinColor="red"
          />
          <Polyline
            coordinates={routeCoordinates.length > 1 ? routeCoordinates : [riderLocation, deliveryCoords]}
            strokeColor="#ED1C24"
            strokeWidth={4}
          />
        </MapView>
      ) : deliveryCoords ? (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: deliveryCoords.latitude,
            longitude: deliveryCoords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          <Marker
            coordinate={deliveryCoords}
            title="Delivery Location (Receiver)"
            description={`${delivery.receiver_name} - ${delivery.delivery_address.split('|')[0]}`}
            pinColor="red"
          />
        </MapView>
      ) : riderLocation ? (
        <View style={styles.mapPlaceholder}>
          <MapPinned size={56} color="#ED1C24" strokeWidth={2} />
          <Text style={styles.mapText}>Loading receiver location...</Text>
        </View>
      ) : (
        <View style={styles.mapPlaceholder}>
          <MapPinned size={56} color="#ED1C24" strokeWidth={2} />
          <Text style={styles.mapText}>Loading Map...</Text>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoCard}>
          <Text style={styles.orderId}>{delivery.tracking_number}</Text>
          <View style={styles.infoRow}>
            <UserRound size={16} color="#333" strokeWidth={2.2} />
            <Text style={styles.customerName}>Receiver: {delivery.receiver_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <MapPinned size={16} color="#666" strokeWidth={2.2} />
            <Text style={styles.address}>{delivery.delivery_address.split('|')[0]}</Text>
          </View>
          {delivery.receiver_phone && (
            <View style={styles.infoRow}>
              <Phone size={16} color="#666" strokeWidth={2.2} />
              <Text style={styles.phone}>{delivery.receiver_phone}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isTrackingActive ? '#4CAF50' : '#FF9800' }]}
            onPress={isTrackingActive ? stopBackgroundTracking : startBackgroundTracking}
          >
            {isTrackingActive ? (
              <Check size={20} color="#fff" strokeWidth={2.4} />
            ) : (
              <MapPinned size={20} color="#fff" strokeWidth={2.4} />
            )}
            <Text style={[styles.actionText, { color: '#fff' }]}>
              {isTrackingActive ? 'Live Tracking Active' : 'Start Live Tracking'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={openMaps}>
            <MapPinned size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.actionText}>Open in Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (delivery.receiver_phone) {
                Linking.openURL(`tel:${delivery.receiver_phone}`);
              } else {
                Alert.alert('No Phone', 'Receiver phone number not available');
              }
            }}
          >
            <Phone size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.actionText}>Call Receiver</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (delivery.receiver_phone) {
                Linking.openURL(`sms:${delivery.receiver_phone}`);
              } else {
                Alert.alert('No Phone', 'Receiver phone number not available');
              }
            }}
          >
            <MessageSquare size={20} color="#333" strokeWidth={2.2} />
            <Text style={styles.actionText}>Message Receiver</Text>
          </TouchableOpacity>
        </View>

        {delivery.status === 'PICKED_UP' && (
          <TouchableOpacity
            style={styles.inTransitButton}
            onPress={async () => {
              if (!delivery) return;
              try {
                await deliveryAPI.updateStatus(delivery.id, 'IN_TRANSIT');
                setDelivery((prev: any) => (prev ? { ...prev, status: 'IN_TRANSIT' } : prev));
                Alert.alert('Success', 'Status updated to In Transit');
              } catch {
                Alert.alert('Error', 'Failed to update status');
              }
            }}
          >
            <View style={styles.inTransitContent}>
              <Truck size={18} color="#fff" strokeWidth={2.2} />
              <Text style={styles.inTransitText}>Mark as In Transit</Text>
            </View>
          </TouchableOpacity>
        )}

        {delivery.status === 'IN_TRANSIT' && (
          <TouchableOpacity
            style={styles.inTransitButton}
            onPress={async () => {
              if (!delivery) return;
              try {
                await deliveryAPI.updateStatus(delivery.id, 'OUT_FOR_DELIVERY');
                setDelivery((prev: any) => (prev ? { ...prev, status: 'OUT_FOR_DELIVERY' } : prev));
                Alert.alert('Success', 'Status updated to Out for Delivery');
              } catch {
                Alert.alert('Error', 'Failed to update status');
              }
            }}
          >
            <View style={styles.inTransitContent}>
              <Truck size={18} color="#fff" strokeWidth={2.2} />
              <Text style={styles.inTransitText}>Mark as Out for Delivery</Text>
            </View>
          </TouchableOpacity>
        )}

        {delivery.status === 'OUT_FOR_DELIVERY' && (
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Text style={styles.completeText}>Complete Delivery</Text>
          </TouchableOpacity>
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  map: {
    height: 300,
    width: '100%',
  },
  mapPlaceholder: {
    height: 300,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  mapText: { fontSize: 18, fontWeight: '600', color: '#333' },
  content: { flex: 1 },
  contentContainer: { padding: 15, paddingBottom: 30 },
  infoCard: {
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
  orderId: { fontSize: 14, fontWeight: '600', color: '#ED1C24', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  customerName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  address: { fontSize: 14, color: '#666', lineHeight: 20, flex: 1 },
  phone: { fontSize: 14, color: '#666' },
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
    gap: 15,
  },
  actionText: { fontSize: 16, fontWeight: '600', color: '#333' },
  inTransitButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  inTransitContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inTransitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  completeButton: {
    backgroundColor: '#ED1C24',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  completeText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
