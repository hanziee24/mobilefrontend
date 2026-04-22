import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, Dimensions, ScrollView, ActivityIndicator, Platform } from 'react-native';
import * as Location from 'expo-location';

// Conditionally import react-native-maps only on native platforms
let MapView: any;
let Marker: any;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

const { width, height } = Dimensions.get('window');

interface MapPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (address: string, latitude: number, longitude: number) => void;
  initialAddress?: string;
}

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export default function MapPicker({ visible, onClose, onSelectLocation, initialAddress }: MapPickerProps) {
  // Show error on web
  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Map Not Available</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.content}>
              <Text style={styles.webWarning}>📱 Map picker is only available on mobile devices.</Text>
              <Text style={styles.webWarning}>Please use the mobile app to select locations on the map.</Text>
              <TouchableOpacity style={styles.confirmBtn} onPress={onClose}>
                <Text style={styles.confirmBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
  const [region, setRegion] = useState<Region>({
    latitude: 10.3157,  // Cebu City default
    longitude: 123.8854,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [markerPosition, setMarkerPosition] = useState({
    latitude: 10.3157,
    longitude: 123.8854,
  });
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || '');
  const [searchQuery, setSearchQuery] = useState(initialAddress || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isValidatingLocation, setIsValidatingLocation] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<'high' | 'medium' | 'low'>('medium');
  const [hasGPSCoordinates, setHasGPSCoordinates] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = location.coords;
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        setMarkerPosition({ latitude, longitude });
        reverseGeocode(latitude, longitude);
      }
    } catch (error) {
      console.log('Location permission denied or error:', error);
    }
  };

  const validateGPSCoordinates = (latitude: number, longitude: number): boolean => {
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return false;
    }
    // Check if coordinates are not at 0,0 (null island)
    if (latitude === 0 && longitude === 0) {
      return false;
    }
    return true;
  };

  const calculateLocationAccuracy = (latitude: number, longitude: number): 'high' | 'medium' | 'low' => {
    // Philippines bounds: roughly 4.5°N to 21°N, 116°E to 127°E
    const inPhilippines = latitude >= 4.5 && latitude <= 21 && longitude >= 116 && longitude <= 127;
    
    if (inPhilippines) {
      return 'high';
    } else if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      return 'medium';
    }
    return 'low';
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    setIsValidatingLocation(true);
    try {
      // Validate coordinates
      if (!validateGPSCoordinates(latitude, longitude)) {
        Alert.alert('Invalid Coordinates', 'The selected coordinates are not valid.');
        setIsValidatingLocation(false);
        return;
      }

      const accuracy = calculateLocationAccuracy(latitude, longitude);
      setLocationAccuracy(accuracy);
      setHasGPSCoordinates(true);

      // Try Google Maps Geocoding API first (if API key is available)
      const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
      
      if (GOOGLE_API_KEY) {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
          );
          const data = await response.json();
          
          if (data.status === 'OK' && data.results.length > 0) {
            const address = data.results[0].formatted_address;
            setSelectedAddress(address);
            setSearchQuery(address);
            setIsValidatingLocation(false);
            return;
          }
        } catch (error) {
          console.log('Google Geocoding failed, falling back to OSM');
        }
      }

      // Fallback to OpenStreetMap
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'DeliveryTrackApp/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      if (data && data.address) {
        const a = data.address;
        const parts = [
          a.amenity || a.building || a.shop || a.office,
          a.house_number ? `${a.house_number} ${a.road || a.street || ''}`.trim() : (a.road || a.street),
          a.suburb || a.village || a.neighbourhood,
          a.city || a.town || a.municipality,
          a.province || a.state,
        ].filter(Boolean);
        const address = parts.length > 0 ? parts.join(', ') : data.display_name;
        setSelectedAddress(address);
        setSearchQuery(address);
      } else {
        const fallbackAddress = `Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
        setSelectedAddress(fallbackAddress);
        setSearchQuery(fallbackAddress);
      }
    } catch (error) {
      const fallbackAddress = `Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
      setSelectedAddress(fallbackAddress);
      setSearchQuery(fallbackAddress);
    } finally {
      setIsValidatingLocation(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMarkerPosition({ latitude, longitude });
    await reverseGeocode(latitude, longitude);

  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setShowResults(false);
    
    const coordPattern = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
    const coordMatch = searchQuery.match(coordPattern);
    
    if (coordMatch) {
      const latitude = parseFloat(coordMatch[1]);
      const longitude = parseFloat(coordMatch[2]);
      
      if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        setMarkerPosition({ latitude, longitude });
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setSelectedAddress(address);
          setSearchQuery(address);
        } catch (error) {
          const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setSelectedAddress(coords);
          setSearchQuery(coords);
        }
        setShowResults(false);
      } else {
        Alert.alert('Invalid Coordinates', 'Please enter valid latitude (-90 to 90) and longitude (-180 to 180)');
      }
    } else {
      try {
        const encodedQuery = encodeURIComponent(searchQuery.trim());
        const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
        
        // Try Google Places API first (if API key is available)
        if (GOOGLE_API_KEY) {
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&region=ph&key=${GOOGLE_API_KEY}`
            );
            const data = await response.json();
            
            if (data.status === 'OK' && data.results.length > 0) {
              const formattedResults = data.results.map((place: any) => ({
                lat: place.geometry.location.lat,
                lon: place.geometry.location.lng,
                display_name: place.formatted_address,
                name: place.name,
                type: place.types[0],
              }));
              setSearchResults(formattedResults);
              setShowResults(true);
              setIsSearching(false);
              return;
            }
          } catch (error) {
            console.log('Google Places failed, falling back to OSM');
          }
        }

        // Fallback to OpenStreetMap Nominatim
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=ph&limit=10&addressdetails=1&extratags=1`,
          {
            headers: {
              'User-Agent': 'DeliveryTrackApp/1.0'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Search failed');
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          setSearchResults(data);
          setShowResults(true);
        } else {
          Alert.alert('Not Found', 'Location not found. Try: "Nyor\'s Sisigan Cebu" or "Jollibee Ayala"');
          setShowResults(false);
        }
      } catch (error: any) {
        console.log('Search error:', error);
        Alert.alert('Search Error', 'Please check your internet connection and try again');
        setShowResults(false);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const selectSearchResult = (result: any) => {
    const { lat, lon, display_name, name, type } = result;
    const newRegion = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setRegion(newRegion);
    setMarkerPosition({ latitude: parseFloat(lat), longitude: parseFloat(lon) });
    
    // Use business name if available, otherwise use full display name
    const businessName = name || display_name.split(',')[0];
    const fullAddress = display_name;
    
    // Show business name prominently
    setSelectedAddress(fullAddress);
    setSearchQuery(businessName);
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
              <Text style={styles.searchHint}>Search for places, restaurants, shops, or addresses</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="e.g., Nyor's Sisigan, Jollibee, SM Cebu"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#999"
                  onSubmitEditing={handleSearch}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={isSearching}>
                  {isSearching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.searchBtnText}>🔍</Text>
                  )}
                </TouchableOpacity>
              </View>

              {hasGPSCoordinates && (
                <View style={[styles.accuracyBadge, 
                  locationAccuracy === 'high' ? styles.accuracyHigh : 
                  locationAccuracy === 'medium' ? styles.accuracyMedium : styles.accuracyLow
                ]}>
                  <Text style={styles.accuracyText}>
                    {locationAccuracy === 'high' ? '✅ High Accuracy (Philippines)' :
                     locationAccuracy === 'medium' ? '⚠️ Medium Accuracy' :
                     '❌ Low Accuracy - Please verify location'}
                  </Text>
                </View>
              )}

              {isValidatingLocation && (
                <View style={styles.validatingContainer}>
                  <ActivityIndicator size="small" color="#ED1C24" />
                  <Text style={styles.validatingText}>Validating location...</Text>
                </View>
              )}

              {showResults && searchResults.length > 0 && (
                <ScrollView style={styles.resultsContainer} nestedScrollEnabled={true}>
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.resultItem}
                      onPress={() => selectSearchResult(result)}
                    >
                      <Text style={styles.resultIcon}>
                        {result.type === 'restaurant' || result.type === 'fast_food' ? '🍴' :
                         result.type === 'cafe' ? '☕' :
                         result.type === 'shop' || result.type === 'mall' ? '🏪' :
                         result.type === 'gym' || result.type === 'fitness_centre' ? '🏋️' :
                         result.type === 'hospital' || result.type === 'clinic' ? '🏥' :
                         result.type === 'school' || result.type === 'university' ? '🏫' :
                         '📍'}
                      </Text>
                      <View style={styles.resultTextContainer}>
                        {result.name && (
                          <Text style={styles.resultName}>{result.name}</Text>
                        )}
                        <Text style={styles.resultAddress} numberOfLines={2}>
                          {result.display_name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <MapView
                style={styles.map}
                region={region}
                onPress={handleMapPress}
                onRegionChangeComplete={setRegion}
              >
                <Marker
                  coordinate={markerPosition}
                  draggable
                  onDragEnd={handleMapPress}
                />
              </MapView>

              <View style={styles.addressDisplay}>
                <Text style={styles.addressLabel}>Selected Address:</Text>
                <Text style={styles.addressText}>
                  {selectedAddress || 'Tap on map to select location'}
                </Text>
                {hasGPSCoordinates && (
                  <Text style={styles.coordinatesText}>
                    📍 GPS: {markerPosition.latitude.toFixed(6)}, {markerPosition.longitude.toFixed(6)}
                  </Text>
                )}
              </View>

              <View style={styles.noteContainer}>
                <Text style={styles.note}>📍 Tap on the map or drag the marker to select a location</Text>
                <Text style={styles.note}>🔍 Search for places, businesses, or addresses</Text>
                <Text style={styles.note}>✅ GPS coordinates are automatically validated</Text>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    flexDirection: 'column',
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeBtn: {
    fontSize: 28,
    color: '#999',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  searchHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  searchBtn: {
    backgroundColor: '#4CAF50',
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  searchBtnText: {
    fontSize: 24,
  },
  map: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 15,
  },
  addressDisplay: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
  },
  note: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  noteContainer: {
    marginTop: 5,
  },
  accuracyBadge: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accuracyHigh: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  accuracyMedium: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  accuracyLow: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  accuracyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  validatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  validatingText: {
    fontSize: 13,
    color: '#666',
  },
  coordinatesText: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 250,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 12,
    color: '#666',
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#ED1C24',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  webWarning: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
});
