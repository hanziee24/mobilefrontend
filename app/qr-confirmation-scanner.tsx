import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { router } from 'expo-router';
import { deliveryAPI, authAPI } from '../services/api';

export default function DeliveryConfirmationScanner() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanType, setScanType] = useState<'pickup' | 'delivery'>('pickup');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    getCameraPermissions();
    checkRiderStatus();
  }, []);

  const checkRiderStatus = async () => {
    try {
      const response = await authAPI.getProfile();
      setIsOnline(response.data.is_online || false);
    } catch (_error) {
      console.log('Failed to check rider status');
    }
  };

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    
    try {
      // Validate QR code format
      if (!data.startsWith('TRK-')) {
        Alert.alert('Invalid QR Code', 'This is not a valid delivery QR code', [
          { text: 'OK', onPress: () => setScanned(false) }
        ]);
        return;
      }

      const deliveries = await deliveryAPI.getActiveDeliveries();
      const delivery = deliveries.data.find((d: any) => d.tracking_number === data);
      
      if (!delivery) {
        Alert.alert('Not Found', 'No active delivery found with this tracking number', [
          { text: 'OK', onPress: () => setScanned(false) }
        ]);
        return;
      }

      // Check if this is the rider's delivery
      if (delivery.rider_details?.id !== delivery.rider) {
        Alert.alert('Error', 'This delivery is not assigned to you', [
          { text: 'OK', onPress: () => setScanned(false) }
        ]);
        return;
      }

      if (scanType === 'pickup') {
        handlePickupScan(delivery);
      } else {
        handleDeliveryScan(delivery);
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to scan QR code', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    }
  };

  const handlePickupScan = (delivery: any) => {
    if (!isOnline) {
      Alert.alert(
        'Offline Status',
        'You must be online to pick up packages. Please set your status to online in the dashboard.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
      return;
    }

    if (delivery.status !== 'PENDING') {
      Alert.alert(
        'Already Picked Up',
        `This package has already been picked up. Current status: ${delivery.status}`,
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
      return;
    }

    Alert.alert(
      'Confirm Pickup',
      `Package: ${delivery.tracking_number}\nFrom: ${delivery.sender_name}\nTo: ${delivery.receiver_name}\n\nConfirm pickup?`,
      [
        { text: 'Cancel', onPress: () => setScanned(false) },
        { 
          text: 'Confirm Pickup', 
          onPress: async () => {
            try {
              await deliveryAPI.updateStatus(delivery.id, 'PICKED_UP');
              Alert.alert('Success', 'Package picked up successfully!', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (_error) {
              Alert.alert('Error', 'Failed to update status');
              setScanned(false);
            }
          }
        }
      ]
    );
  };

  const handleDeliveryScan = (delivery: any) => {
    if (delivery.status === 'DELIVERED') {
      Alert.alert(
        'Already Delivered',
        'This package has already been delivered',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
      return;
    }

    if (delivery.status === 'PENDING') {
      Alert.alert(
        'Not Picked Up',
        'Please pick up the package first before delivery',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
      return;
    }

    Alert.alert(
      'Confirm Delivery',
      `Package: ${delivery.tracking_number}\nReceiver: ${delivery.receiver_name}\n\nConfirm delivery completion?`,
      [
        { text: 'Cancel', onPress: () => setScanned(false) },
        { 
          text: 'Complete Delivery', 
          onPress: () => {
            setScanned(false);
            router.push('/proof-of-delivery');
          }
        }
      ]
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan QR Code</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.scanTypeSelector}>
        <TouchableOpacity 
          style={[styles.typeBtn, scanType === 'pickup' && styles.typeBtnActive]}
          onPress={() => setScanType('pickup')}
        >
          <Text style={[styles.typeText, scanType === 'pickup' && styles.typeTextActive]}>
            📦 Pickup
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.typeBtn, scanType === 'delivery' && styles.typeBtnActive]}
          onPress={() => setScanType('delivery')}
        >
          <Text style={[styles.typeText, scanType === 'delivery' && styles.typeTextActive]}>
            ✅ Delivery
          </Text>
        </TouchableOpacity>
      </View>

      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instruction}>
            {scanType === 'pickup' 
              ? 'Scan QR code to pick up package' 
              : 'Scan QR code to confirm delivery'}
          </Text>
        </View>
      </CameraView>

      {scanned && (
        <TouchableOpacity
          style={styles.rescanButton}
          onPress={() => setScanned(false)}
        >
          <Text style={styles.rescanText}>Tap to Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#000',
  },
  backButton: { fontSize: 28, color: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  scanTypeSelector: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: '#000',
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#333',
  },
  typeBtnActive: {
    backgroundColor: '#ED1C24',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  typeTextActive: {
    color: '#fff',
  },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#ED1C24',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    marginTop: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  text: { fontSize: 16, color: '#fff', marginBottom: 20, textAlign: 'center' },
  button: {
    backgroundColor: '#ED1C24',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  rescanButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: '#ED1C24',
    padding: 15,
    borderRadius: 10,
  },
  rescanText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
