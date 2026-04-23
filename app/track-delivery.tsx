import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { deliveryAPI } from '../services/api';
import { WebView } from 'react-native-webview';

type RoutePoint = { latitude: number; longitude: number };

type AddressDetails = {
  label: string;
  coords: RoutePoint | null;
};

const parseAddressWithCoords = (rawAddress?: string): AddressDetails => {
  const parts = (rawAddress || '')
    .split('|')
    .map(part => part.trim())
    .filter(Boolean);
  const label = (parts.length > 1 ? parts.slice(0, -1).join(' | ') : parts[0] || '').trim();
  const coordsPart = parts.length > 1 ? parts[parts.length - 1] : null;

  if (!coordsPart) {
    return { label, coords: null };
  }

  const [lat, lng] = coordsPart.split(',').map(Number);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return { label, coords: null };
  }

  return {
    label,
    coords: { latitude: lat, longitude: lng },
  };
};

function getTrackingLeafletHTML(
  riderLocation: RoutePoint | null,
  pickupCoords: RoutePoint | null,
  deliveryCoords: RoutePoint | null,
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

  const pickupLatLng = pickupCoords ? JSON.stringify([pickupCoords.latitude, pickupCoords.longitude]) : 'null';
  const deliveryLatLng = deliveryCoords ? JSON.stringify([deliveryCoords.latitude, deliveryCoords.longitude]) : 'null';
  const riderLatLng = riderLocation ? JSON.stringify([riderLocation.latitude, riderLocation.longitude]) : 'null';
  const routeLatLngs = JSON.stringify(route.map(p => [p.latitude, p.longitude]));
  const riderName = `${delivery?.rider_details?.first_name || ''} ${delivery?.rider_details?.last_name || ''}`.trim();
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
        .bindPopup('${riderName || 'Your Rider'}')
        .addTo(map);
    }

    if (${routeLatLngs}.length > 1) {
      map.fitBounds(window.routeLine.getBounds(), { padding: [40, 40] });
    }
  </script>
</body>
</html>`;
}

export default function TrackDelivery() {
  const params = useLocalSearchParams();
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [riderLocation, setRiderLocation] = useState<RoutePoint | null>(null);
  const [pickupCoords, setPickupCoords] = useState<RoutePoint | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<RoutePoint | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
  const webViewRef = useRef<WebView>(null);
  const isFirstLoad = useRef(true);
  const rawIdParam =
    (Array.isArray(params.id) ? params.id[0] : params.id) ??
    (Array.isArray((params as any).deliveryId) ? (params as any).deliveryId[0] : (params as any).deliveryId);
  const deliveryId = rawIdParam !== undefined && rawIdParam !== null ? Number(rawIdParam) : null;
  const hasValidId = deliveryId !== null && Number.isFinite(deliveryId);

  useEffect(() => {
    isFirstLoad.current = true;
    setLoading(true);
    fetchDelivery();
    const interval = setInterval(fetchDelivery, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawIdParam]);

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
    } catch {
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
      if (!window.pickupMarker && ${pickupJson}) {
        window.pickupMarker = L.marker(${pickupJson}, { icon: pickupIcon }).addTo(map);
      }
      if (window.pickupMarker && ${pickupJson}) {
        window.pickupMarker.setLatLng(${pickupJson});
      }
      if (!window.deliveryMarker && ${deliveryJson}) {
        window.deliveryMarker = L.marker(${deliveryJson}, { icon: destIcon }).addTo(map);
      }
      if (window.deliveryMarker && ${deliveryJson}) {
        window.deliveryMarker.setLatLng(${deliveryJson});
      }
      if (!window.riderMarker && ${riderJson}) {
        window.riderMarker = L.marker(${riderJson}, { icon: riderIcon }).addTo(map);
      }
      if (window.riderMarker && ${riderJson}) {
        window.riderMarker.setLatLng(${riderJson});
      }
      if (window.routeLine) {
        window.routeLine.setLatLngs(${routeJson});
      }
      if (${routeJson}.length > 1) {
        map.fitBounds(window.routeLine.getBounds(), { padding: [40, 40] });
      }
      true;
    `);
  };

  const fetchDelivery = async () => {
    try {
      setNotFound(false);
      let target = null;
      if (hasValidId) {
        const res = await deliveryAPI.getDelivery(deliveryId as number);
        target = res.data;
      } else if (rawIdParam) {
        setNotFound(true);
        setDelivery(null);
        setRiderLocation(null);
        setPickupCoords(null);
        setDeliveryCoords(null);
        return;
      } else {
        const res = await deliveryAPI.getActiveDeliveries();
        target = res.data.find((d: any) =>
          ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(d.status)
        );
      }

      if (!target) {
        setDelivery(null);
        setRiderLocation(null);
        setPickupCoords(null);
        setDeliveryCoords(null);
        if (rawIdParam) setNotFound(true);
        return;
      }

      setDelivery(target);

      if (target.rider_details?.current_latitude && target.rider_details?.current_longitude) {
        const coords = {
          latitude: parseFloat(target.rider_details.current_latitude),
          longitude: parseFloat(target.rider_details.current_longitude),
        };
        setRiderLocation(coords);

        if (webViewRef.current && !isFirstLoad.current) {
          webViewRef.current.injectJavaScript(`
            if (window.riderMarker) {
              window.riderMarker.setLatLng([${coords.latitude}, ${coords.longitude}]);
            }
            true;
          `);
        }
        isFirstLoad.current = false;
      } else {
        setRiderLocation(null);
      }

      const pickup = parseAddressWithCoords(target.pickup_address);
      const dropoff = parseAddressWithCoords(target.delivery_address);

      const pickupResolved =
        pickup.coords ||
        (target.sender_latitude && target.sender_longitude
          ? { latitude: Number(target.sender_latitude), longitude: Number(target.sender_longitude) }
          : target.rider_details?.branch_latitude && target.rider_details?.branch_longitude
            ? {
                latitude: Number(target.rider_details.branch_latitude),
                longitude: Number(target.rider_details.branch_longitude),
              }
          : await geocodeAddress(pickup.label));

      const dropoffResolved =
        dropoff.coords ||
        (target.delivery_latitude && target.delivery_longitude
          ? { latitude: Number(target.delivery_latitude), longitude: Number(target.delivery_longitude) }
          : await geocodeAddress(dropoff.label));

      setPickupCoords(pickupResolved);
      setDeliveryCoords(dropoffResolved);
    } catch (error: any) {
      if (rawIdParam && error?.response?.status === 404) {
        setNotFound(true);
        setDelivery(null);
        setRiderLocation(null);
        setPickupCoords(null);
        setDeliveryCoords(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PICKED_UP': return 'Picked Up';
      case 'IN_TRANSIT': return 'In Transit';
      case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
      case 'DELIVERED': return 'Delivered';
      default: return status;
    }
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
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Track Delivery</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.emptyText}>
            {notFound ? 'Delivery not found' : 'No active delivery to track'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Track Delivery</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {(riderLocation || pickupCoords || deliveryCoords) ? (
        <WebView
          ref={webViewRef}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          source={{ html: getTrackingLeafletHTML(riderLocation, pickupCoords, deliveryCoords, routeCoordinates, delivery) }}
        />
      ) : (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
          <Text style={styles.mapPlaceholderText}>Waiting for route information...</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {delivery.rider_details && (
          <View style={styles.riderStrip}>
            <View style={styles.riderAvatar}>
              <Text style={{ fontSize: 24 }}>R</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.riderName}>
                {delivery.rider_details.first_name} {delivery.rider_details.last_name}
              </Text>
              <Text style={styles.riderPhone}>Phone: {delivery.rider_details.phone}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{getStatusText(delivery.status)}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.trackingNumber}>{delivery.tracking_number}</Text>

          {delivery.estimated_time && (
            <View style={styles.etaRow}>
              <Text style={styles.etaIcon}>⏱</Text>
              <Text style={styles.etaText}>ETA: {delivery.estimated_time}</Text>
            </View>
          )}

          <View style={styles.routeInfo}>
            <View style={styles.routeItem}>
              <Text style={styles.routeIcon}>S</Text>
              <View style={styles.routeDetails}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={styles.routeAddress}>{delivery.pickup_address?.split('|')[0] || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeItem}>
              <Text style={styles.routeIcon}>D</Text>
              <View style={styles.routeDetails}>
                <Text style={styles.routeLabel}>Delivery</Text>
                <Text style={styles.routeAddress}>{delivery.delivery_address?.split('|')[0] || 'N/A'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.timeline}>
            {[
              { label: 'Order Placed', done: true, time: new Date(delivery.created_at).toLocaleTimeString() },
              { label: 'Picked Up', done: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(delivery.status), time: '' },
              { label: 'In Transit', done: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(delivery.status), time: '' },
              { label: 'Delivered', done: delivery.status === 'DELIVERED', time: '' },
            ].map((step, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={[styles.timelineDot, step.done && styles.dotDone]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineText}>{step.label}</Text>
                  {step.time ? <Text style={styles.timelineTime}>{step.time}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd',
  },
  backButton: { fontSize: 28, color: '#333' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  liveText: { fontSize: 11, fontWeight: 'bold', color: '#4CAF50' },
  map: { height: 300, width: '100%' },
  mapPlaceholder: {
    height: 300, backgroundColor: '#E3F2FD',
    justifyContent: 'center', alignItems: 'center',
  },
  mapPlaceholderIcon: { fontSize: 48, marginBottom: 8 },
  mapPlaceholderText: { fontSize: 14, color: '#666' },
  content: { flex: 1 },
  riderStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', padding: 15, marginBottom: 1,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  riderAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center',
  },
  riderName: { fontSize: 15, fontWeight: '600', color: '#333' },
  riderPhone: { fontSize: 13, color: '#666', marginTop: 2 },
  statusPill: {
    backgroundColor: '#E8F5E9', paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 12,
  },
  statusPillText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 15, padding: 20,
    margin: 15, marginTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  trackingNumber: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  etaIcon: { fontSize: 16 },
  etaText: { fontSize: 14, color: '#E65100', fontWeight: '600' },
  routeInfo: { marginBottom: 20 },
  routeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routeIcon: { fontSize: 18, marginTop: 2, fontWeight: '700', color: '#333' },
  routeDetails: { flex: 1 },
  routeLabel: { fontSize: 11, color: '#999', marginBottom: 3 },
  routeAddress: { fontSize: 14, color: '#333', fontWeight: '500' },
  routeLine: { width: 2, height: 18, backgroundColor: '#ddd', marginLeft: 8, marginVertical: 3 },
  timeline: { gap: 14 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ddd', marginTop: 3 },
  dotDone: { backgroundColor: '#4CAF50' },
  timelineContent: { flex: 1 },
  timelineText: { fontSize: 14, fontWeight: '600', color: '#333' },
  timelineTime: { fontSize: 12, color: '#999', marginTop: 2 },
  emptyText: { fontSize: 16, color: '#999' },
});
