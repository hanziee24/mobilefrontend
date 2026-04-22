import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TextInput, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

interface MapPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (address: string, latitude: number, longitude: number) => void;
  initialAddress?: string;
}

const DEFAULT_LAT = 10.3157;
const DEFAULT_LNG = 123.8854;

export default function MapPicker({ visible, onClose, onSelectLocation, initialAddress }: MapPickerProps) {
  const webViewRef = useRef<WebView>(null);
  const [markerPosition, setMarkerPosition] = useState({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || '');
  const [searchQuery, setSearchQuery] = useState(initialAddress || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (visible) getCurrentLocation();
  }, [visible]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = loc.coords;
        setMarkerPosition({ latitude, longitude });
        moveMapTo(latitude, longitude);
        reverseGeocode(latitude, longitude);
      }
    } catch {}
  };

  const moveMapTo = (lat: number, lng: number) => {
    webViewRef.current?.injectJavaScript(`
      map.setView([${lat}, ${lng}], 16);
      marker.setLatLng([${lat}, ${lng}]);
      true;
    `);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsValidating(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'DeliveryTrackApp/1.0' } }
      );
      const data = await res.json();
      if (data?.address) {
        const a = data.address;
        const parts = [
          a.amenity || a.building || a.shop || a.office,
          a.house_number ? `${a.house_number} ${a.road || ''}`.trim() : a.road,
          a.suburb || a.village || a.neighbourhood,
          a.city || a.town || a.municipality,
          a.province || a.state,
        ].filter(Boolean);
        const address = parts.length > 0 ? parts.join(', ') : data.display_name;
        setSelectedAddress(address);
        setSearchQuery(address);
      } else {
        const fallback = `Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
        setSelectedAddress(fallback);
        setSearchQuery(fallback);
      }
    } catch {
      const fallback = `Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
      setSelectedAddress(fallback);
      setSearchQuery(fallback);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setShowResults(false);

    const coordMatch = searchQuery.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setMarkerPosition({ latitude: lat, longitude: lng });
        moveMapTo(lat, lng);
        await reverseGeocode(lat, lng);
      } else {
        Alert.alert('Invalid Coordinates');
      }
      setIsSearching(false);
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=ph&limit=10&addressdetails=1`,
        { headers: { 'User-Agent': 'DeliveryTrackApp/1.0' } }
      );
      const data = await res.json();
      if (data?.length > 0) {
        setSearchResults(data);
        setShowResults(true);
      } else {
        Alert.alert('Not Found', 'No results found. Try a different search term.');
      }
    } catch {
      Alert.alert('Search Error', 'Check your internet connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setMarkerPosition({ latitude: lat, longitude: lng });
    moveMapTo(lat, lng);
    setSelectedAddress(result.display_name);
    setSearchQuery(result.name || result.display_name.split(',')[0]);
    setShowResults(false);
  };

  const handleConfirm = () => {
    if (!selectedAddress.trim()) {
      Alert.alert('Error', 'Please select a location on the map');
      return;
    }
    onSelectLocation(selectedAddress, markerPosition.latitude, markerPosition.longitude);
    onClose();
  };

  const onWebViewMessage = (event: any) => {
    try {
      const { lat, lng } = JSON.parse(event.nativeEvent.data);
      setMarkerPosition({ latitude: lat, longitude: lng });
      reverseGeocode(lat, lng);
    } catch {}
  };

  const leafletHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${DEFAULT_LAT}, ${DEFAULT_LNG}], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var marker = L.marker([${DEFAULT_LAT}, ${DEFAULT_LNG}], { draggable: true }).addTo(map);

    function sendCoords(lat, lng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
    }

    marker.on('dragend', function(e) {
      var pos = e.target.getLatLng();
      sendCoords(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      sendCoords(e.latlng.lat, e.latlng.lng);
    });

    window.ReactNativeWebView.postMessage(JSON.stringify({ ready: true }));
  </script>
</body>
</html>
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Location</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <Text style={styles.label}>Search Address</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="e.g., Jollibee SM Cebu, Ayala"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#999"
                  onSubmitEditing={handleSearch}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={isSearching}>
                  {isSearching
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.searchBtnText}>🔍</Text>}
                </TouchableOpacity>
              </View>

              {isValidating && (
                <View style={styles.validatingContainer}>
                  <ActivityIndicator size="small" color="#ED1C24" />
                  <Text style={styles.validatingText}>Getting address...</Text>
                </View>
              )}

              {showResults && searchResults.length > 0 && (
                <ScrollView style={styles.resultsContainer} nestedScrollEnabled>
                  {searchResults.map((result, index) => (
                    <TouchableOpacity key={index} style={styles.resultItem} onPress={() => selectSearchResult(result)}>
                      <Text style={styles.resultIcon}>📍</Text>
                      <View style={styles.resultTextContainer}>
                        {result.name && <Text style={styles.resultName}>{result.name}</Text>}
                        <Text style={styles.resultAddress} numberOfLines={2}>{result.display_name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <WebView
                ref={webViewRef}
                style={styles.map}
                source={{ html: leafletHTML }}
                onMessage={onWebViewMessage}
                onLoad={() => {
                  setMapReady(true);
                  getCurrentLocation();
                }}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
              />

              <View style={styles.addressDisplay}>
                <Text style={styles.addressLabel}>Selected Address:</Text>
                <Text style={styles.addressText}>
                  {selectedAddress || 'Tap on map to select location'}
                </Text>
                <Text style={styles.coordinatesText}>
                  📍 GPS: {markerPosition.latitude.toFixed(6)}, {markerPosition.longitude.toFixed(6)}
                </Text>
              </View>

              <View style={styles.noteContainer}>
                <Text style={styles.note}>📍 Tap on the map or drag the marker to select a location</Text>
                <Text style={styles.note}>🔍 Search for places, businesses, or addresses</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%', flexDirection: 'column' },
  scrollContent: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  closeBtn: { fontSize: 28, color: '#999' },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, backgroundColor: '#fff', fontSize: 16 },
  searchBtn: { backgroundColor: '#4CAF50', width: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  searchBtnText: { fontSize: 24 },
  map: { width: '100%', height: 300, borderRadius: 10, marginBottom: 15 },
  addressDisplay: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, marginBottom: 10 },
  addressLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
  addressText: { fontSize: 14, color: '#333' },
  coordinatesText: { fontSize: 11, color: '#4CAF50', marginTop: 4 },
  noteContainer: { marginTop: 5 },
  note: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 4 },
  validatingContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#f9f9f9', borderRadius: 8, marginBottom: 10, gap: 8 },
  validatingText: { fontSize: 13, color: '#666' },
  resultsContainer: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', maxHeight: 200 },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  resultIcon: { fontSize: 18, marginRight: 10 },
  resultTextContainer: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 2 },
  resultAddress: { fontSize: 12, color: '#666' },
  footer: { flexDirection: 'row', padding: 20, gap: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: '#666' },
  confirmBtn: { flex: 1, padding: 15, borderRadius: 10, backgroundColor: '#ED1C24', alignItems: 'center' },
  confirmBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
