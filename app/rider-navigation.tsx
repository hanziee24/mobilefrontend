import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { deliveryAPI } from '../services/api';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
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

type AddressDetails = {
  label: string;
  coords: RoutePoint | null;
};

const parseAddressWithCoords = (rawAddress?: string): AddressDetails => {
  const [addressPart, coordsPart] = (rawAddress || '').split('|');
  const label = (addressPart || '').trim();

  if (!coordsPart) {
    return { label, coords: null };
  }

  const [lat, lng] = coordsPart.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { label, coords: null };
  }

  return {
    label,
    coords: { latitude: lat, longitude: lng },
  };
};

const formatAddressLabel = (rawAddress?: string, fallback = 'N/A') => {
  const details = parseAddressWithCoords(rawAddress);
  return details.label || fallback;
};

function getLeafletHTML(
  pickupCoords: RoutePoint | null,
  deliveryCoords: RoutePoint | null,
  riderLocation: RoutePoint | null,
  routeCoordinates: RoutePoint[],
  delivery: any
) {
  const center = deliveryCoords
    ? [deliveryCoords.latitude, deliveryCoords.longitude]
    : pickupCoords
      ? [pickupCoords.latitude, pickupCoords.longitude]
      : riderLocation
        ? [riderLocation.latitude, riderLocation.longitude]
        : [10.3157, 123.8854];

  const route = routeCoordinates.length > 1
    ? routeCoordinates
    : pickupCoords && deliveryCoords
      ? [pickupCoords, deliveryCoords]
      : riderLocation && deliveryCoords
        ? [riderLocation, deliveryCoords]
        : riderLocation && pickupCoords
          ? [riderLocation, pickupCoords]
          : [];

  const routeLatLngs = JSON.stringify(route.map(p => [p.latitude, p.longitude]));
  const pickupLatLng = pickupCoords ? JSON.stringify([pickupCoords.latitude, pickupCoords.longitude]) : 'null';
  const deliveryLatLng = deliveryCoords ? JSON.stringify([deliveryCoords.latitude, deliveryCoords.longitude]) : 'null';
  const riderLatLng = riderLocation ? JSON.stringify([riderLocation.latitude, riderLocation.longitude]) : 'null';
  const pickupLabel = delivery?.pickup_address?.split('|')[0] || 'Pickup';
  const deliveryLabel = delivery?.delivery_address?.split('|')[0] || 'Delivery';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>* { margin:0; padding:0; } html,body,#map { width:100%; height:100%; }</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView(${JSON.stringify(center)}, 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OSM' }).addTo(map);

    var riderIcon = L.divIcon({
      html: '<div style="background:#fff;border:2px solid #ED1C24;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.25)">R</div>',
      className: '',
      iconAnchor: [14, 14]
    });
    var pickupIcon = L.divIcon({
      html: '<div style="background:#fff;border:2px solid #2E7D32;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.25)">S</div>',
      className: '',
      iconAnchor: [14, 28]
    });
    var destIcon = L.divIcon({
      html: '<div style="background:#fff;border:2px solid #1565C0;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.25)">D</div>',
      className: '',
      iconAnchor: [14, 28]
    });

    window.routeLine = L.polyline(${routeLatLngs}, { color: '#ED1C24', weight: 4 }).addTo(map);

    if (${pickupLatLng}) {
      window.pickupMarker = L.marker(${pickupLatLng}, { icon: pickupIcon })
        .bindPopup('<b>Pickup</b><br>${pickupLabel}')
        .addTo(map);
    }

    if (${deliveryLatLng}) {
      window.deliveryMarker = L.marker(${deliveryLatLng}, { icon: destIcon })
        .bindPopup('<b>Delivery</b><br>${deliveryLabel}')
        .addTo(map);
    }

    if (${riderLatLng}) {
      window.riderMarker = L.marker(${riderLatLng}, { icon: riderIcon })
        .bindPopup('Your Location')
        .addTo(map);
    }

    if (${routeLatLngs}.length > 1) {
      map.fitBounds(window.routeLine.getBounds(), { padding: [40, 40] });
    }
  </script>
</body>
</html>`;
}

export default function RiderNavigation() {
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [riderLocation, setRiderLocation] = useState<RoutePoint | null>(null);
  const [pickupCoords, setPickupCoords] = useState<RoutePoint | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<RoutePoint | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    fetchDelivery();
    checkTrackingStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (delivery) {
      getCurrentLocation();
      startBackgroundTracking();
      const interval = setInterval(getCurrentLocation, 10000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery]);

  useEffect(() => {
    if (pickupCoords && deliveryCoords) {
      fetchRoadRoute(pickupCoords, deliveryCoords);
    } else if (riderLocation && deliveryCoords) {
      fetchRoadRoute(riderLocation, deliveryCoords);
    } else if (riderLocation && pickupCoords) {
      fetchRoadRoute(riderLocation, pickupCoords);
    } else {
      setRouteCoordinates([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderLocation, pickupCoords, deliveryCoords]);

  useEffect(() => {
    updateLeafletMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCoordinates, pickupCoords, deliveryCoords, riderLocation]);

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
      console.log('Geocode failed for address:', address.replace(/[\r\n]/g, ' '));
      return null;
    }
  };

  const fetchRoadRoute = async (origin: RoutePoint, destination: RoutePoint) => {
    try {
      const oLat = Number(origin.latitude);
      const oLng = Number(origin.longitude);
      const dLat = Number(destination.latitude);
      const dLng = Number(destination.longitude);
      if (!Number.isFinite(oLat) || !Number.isFinite(oLng) || !Number.isFinite(dLat) || !Number.isFinite(dLng)) {
        setRouteCoordinates([origin, destination]);
        return;
      }
      const osrmUrl =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${oLng},${oLat};${dLng},${dLat}` +
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
    } catch {
      setRouteCoordinates([origin, destination]);
    }
  };

  const updateLeafletMap = () => {
    if (!webViewRef.current) return;
    const route = routeCoordinates.length > 1
      ? routeCoordinates
      : pickupCoords && deliveryCoords
        ? [pickupCoords, deliveryCoords]
        : riderLocation && deliveryCoords
          ? [riderLocation, deliveryCoords]
          : riderLocation && pickupCoords
            ? [riderLocation, pickupCoords]
            : [];
    const routeJson = JSON.stringify(route.map(p => [p.latitude, p.longitude]));
    const pickupJson = pickupCoords ? JSON.stringify([pickupCoords.latitude, pickupCoords.longitude]) : 'null';
    const deliveryJson = deliveryCoords ? JSON.stringify([deliveryCoords.latitude, deliveryCoords.longitude]) : 'null';
    const riderJson = riderLocation ? JSON.stringify([riderLocation.latitude, riderLocation.longitude]) : 'null';
    webViewRef.current.injectJavaScript(`
      if (window.pickupMarker && ${pickupJson}) {
        window.pickupMarker.setLatLng(${pickupJson});
      }
      if (window.deliveryMarker && ${deliveryJson}) {
        window.deliveryMarker.setLatLng(${deliveryJson});
      }
      if (window.riderMarker && ${riderJson}) {
        window.riderMarker.setLatLng(${riderJson});
      }
      if (window.routeLine) {
        window.routeLine.setLatLngs(${routeJson});
      }
      if (${routeJson}.length > 0) {
        map.fitBounds(window.routeLine.getBounds(), { padding: [40, 40] });
      }
      true;
    `);
  };

  const fetchDelivery = async () => {
    try {
      const deliveries = await deliveryAPI.getActiveDeliveries();
      const activeDelivery = deliveries.data.find((d: any) =>
        d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT' || d.status === 'OUT_FOR_DELIVERY'
      );

      if (!activeDelivery) {
        setDelivery(null);
        setPickupCoords(null);
        setDeliveryCoords(null);
        return;
      }

      setDelivery(activeDelivery);

      const pickup = parseAddressWithCoords(activeDelivery.pickup_address);
      const dropoff = parseAddressWithCoords(activeDelivery.delivery_address);

      const pickupResolved =
        pickup.coords ||
        (activeDelivery.sender_latitude && activeDelivery.sender_longitude
          ? { latitude: Number(activeDelivery.sender_latitude), longitude: Number(activeDelivery.sender_longitude) }
          : await geocodeAddress(pickup.label));

      const dropoffResolved =
        dropoff.coords ||
        (activeDelivery.delivery_latitude && activeDelivery.delivery_longitude
          ? { latitude: Number(activeDelivery.delivery_latitude), longitude: Number(activeDelivery.delivery_longitude) }
          : await geocodeAddress(dropoff.label));

      setPickupCoords(pickupResolved);
      setDeliveryCoords(dropoffResolved);
    } catch (_error) {
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
    } catch (_error) {
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
    const destination = deliveryCoords
      ? `${deliveryCoords.latitude},${deliveryCoords.longitude}`
      : formatAddressLabel(delivery.delivery_address);
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

      <WebView
        ref={webViewRef}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        source={{ html: getLeafletHTML(pickupCoords, deliveryCoords, riderLocation, routeCoordinates, delivery) }}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoCard}>
          <Text style={styles.orderId}>{delivery.tracking_number}</Text>
          <View style={styles.infoRow}>
            <UserRound size={16} color="#333" strokeWidth={2.2} />
            <Text style={styles.customerName}>Receiver: {delivery.receiver_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <MapPinned size={16} color="#666" strokeWidth={2.2} />
            <Text style={styles.address}>Pickup: {formatAddressLabel(delivery.pickup_address)}</Text>
          </View>
          <View style={styles.infoRow}>
            <MapPinned size={16} color="#666" strokeWidth={2.2} />
            <Text style={styles.address}>Delivery: {formatAddressLabel(delivery.delivery_address)}</Text>
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
