import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { deliveryAPI } from '../services/api';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

export default function DeliveryQRCode() {
  const params = useLocalSearchParams();
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  let qrRef: any = null;

  useEffect(() => {
    fetchDelivery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const fetchDelivery = async () => {
    try {
      const deliveryId = params.id;
      if (deliveryId) {
        const response = await deliveryAPI.getDelivery(Number(deliveryId));
        setDelivery(response.data);
      }
    } catch {
      Alert.alert('Error', 'Failed to load delivery');
    } finally {
      setLoading(false);
    }
  };

  const shareQRCode = async () => {
    try {
      qrRef.toDataURL(async (data: string) => {
        const file = new File(Paths.document, `${delivery.tracking_number}.png`);
        file.write(data, { encoding: 'base64' });
        
        await Sharing.shareAsync(file.uri, {
          mimeType: 'image/png',
          dialogTitle: `Share QR Code - ${delivery.tracking_number}`,
        });
      });
    } catch {
      Alert.alert('Error', 'Failed to share QR code');
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
          <Text style={styles.title}>QR Code</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.emptyText}>Delivery not found</Text>
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
        <Text style={styles.title}>Delivery QR Code</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.qrCard}>
          <Text style={styles.trackingNumber}>{delivery.tracking_number}</Text>
          <Text style={styles.subtitle}>Scan this QR code to track or pick up</Text>
          
          <View style={styles.qrContainer}>
            <QRCode
              value={delivery.tracking_number}
              size={220}
              backgroundColor="white"
              color="black"
              getRef={(ref) => (qrRef = ref)}
            />
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>From:</Text>
              <Text style={styles.infoValue}>{delivery.sender_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>To:</Text>
              <Text style={styles.infoValue}>{delivery.receiver_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.infoValue, styles.statusText]}>{delivery.status}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={shareQRCode}>
          <Text style={styles.shareText}>📤 Share QR Code</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.printButton} 
          onPress={() => router.push({ pathname: '/printable-qr-label', params: { id: delivery.id } } as any)}
        >
          <Text style={styles.printText}>🖨️ Print Label</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.historyButton} 
          onPress={() => router.push('/qr-scan-history' as any)}
        >
          <Text style={styles.historyText}>📊 View Scan History</Text>
        </TouchableOpacity>

        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>📱 How to use:</Text>
          <Text style={styles.instructionText}>• Rider scans QR to pick up package</Text>
          <Text style={styles.instructionText}>• Customer can scan to track delivery</Text>
          <Text style={styles.instructionText}>• Share QR code with sender/receiver</Text>
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
  content: { padding: 15 },
  emptyText: { fontSize: 16, color: '#999' },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 15,
  },
  trackingNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ED1C24',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 20,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  statusText: {
    color: '#ED1C24',
    fontWeight: 'bold',
  },
  shareButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  shareText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  printButton: {
    backgroundColor: '#ED1C24',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  printText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  historyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
});
