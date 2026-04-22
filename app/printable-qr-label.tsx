import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { deliveryAPI } from '../services/api';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

export default function PrintableQRLabel() {
  const params = useLocalSearchParams();
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const labelRef = useRef(null);

  useEffect(() => {
    fetchDelivery();
  }, []);

  const fetchDelivery = async () => {
    try {
      const deliveryId = params.id;
      if (deliveryId) {
        const response = await deliveryAPI.getDelivery(Number(deliveryId));
        setDelivery(response.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load delivery');
    } finally {
      setLoading(false);
    }
  };

  const generatePrintableHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @page {
            size: 4in 6in;
            margin: 0;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            width: 4in;
            height: 6in;
            box-sizing: border-box;
          }
          .label {
            border: 3px solid #ED1C24;
            padding: 15px;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #ED1C24;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #ED1C24;
            margin-bottom: 5px;
          }
          .tracking {
            font-size: 20px;
            font-weight: bold;
            color: #333;
          }
          .qr-container {
            text-align: center;
            margin: 20px 0;
          }
          .qr-code {
            width: 200px;
            height: 200px;
            margin: 0 auto;
          }
          .info-section {
            margin: 10px 0;
          }
          .info-label {
            font-size: 12px;
            color: #666;
            font-weight: bold;
            margin-bottom: 3px;
          }
          .info-value {
            font-size: 14px;
            color: #333;
            margin-bottom: 10px;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            color: #999;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            margin-top: 10px;
          }
          .barcode-text {
            font-family: 'Courier New', monospace;
            font-size: 16px;
            letter-spacing: 2px;
            text-align: center;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="header">
            <div class="company-name">📦 JRNZ Tracking Express</div>
            <div class="tracking">${delivery.tracking_number}</div>
          </div>
          
          <div class="qr-container">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${delivery.tracking_number}" 
                 class="qr-code" alt="QR Code">
            <div class="barcode-text">${delivery.tracking_number}</div>
          </div>
          
          <div class="info-section">
            <div class="info-label">FROM:</div>
            <div class="info-value">${delivery.sender_name}<br>${delivery.sender_contact}</div>
            
            <div class="info-label">TO:</div>
            <div class="info-value">${delivery.receiver_name}<br>${delivery.receiver_contact}</div>
            
            <div class="info-label">DELIVERY ADDRESS:</div>
            <div class="info-value">${delivery.delivery_address}</div>
            
            <div class="info-label">FEE:</div>
            <div class="info-value">₱${delivery.delivery_fee}</div>
          </div>
          
          <div class="footer">
            Scan QR code to track or confirm delivery<br>
            Created: ${new Date().toLocaleDateString()}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const html = generatePrintableHTML();
      await Print.printAsync({
        html,
        width: 288, // 4 inches at 72 DPI
        height: 432, // 6 inches at 72 DPI
      });
      Alert.alert('Success', 'Label sent to printer');
    } catch (error) {
      Alert.alert('Error', 'Failed to print label');
    } finally {
      setPrinting(false);
    }
  };

  const handleSavePDF = async () => {
    setPrinting(true);
    try {
      const html = generatePrintableHTML();
      const { uri } = await Print.printToFileAsync({
        html,
        width: 288,
        height: 432,
      });
      
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Delivery Label - ${delivery.tracking_number}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save PDF');
    } finally {
      setPrinting(false);
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
          <Text style={styles.title}>Print Label</Text>
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
        <Text style={styles.title}>Printable Label</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.previewCard} ref={labelRef}>
          <View style={styles.labelHeader}>
            <Text style={styles.companyName}>📦 JRNZ Tracking Express</Text>
            <Text style={styles.trackingNumber}>{delivery.tracking_number}</Text>
          </View>

          <View style={styles.qrSection}>
            <QRCode
              value={delivery.tracking_number}
              size={180}
              backgroundColor="white"
              color="black"
            />
            <Text style={styles.barcodeText}>{delivery.tracking_number}</Text>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>FROM:</Text>
              <Text style={styles.infoValue}>{delivery.sender_name}</Text>
              <Text style={styles.infoSubValue}>{delivery.sender_contact}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>TO:</Text>
              <Text style={styles.infoValue}>{delivery.receiver_name}</Text>
              <Text style={styles.infoSubValue}>{delivery.receiver_contact}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>DELIVERY ADDRESS:</Text>
              <Text style={styles.infoValue}>{delivery.delivery_address}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>FEE:</Text>
              <Text style={[styles.infoValue, { color: '#4CAF50', fontWeight: 'bold' }]}>
                ₱{delivery.delivery_fee}
              </Text>
            </View>
          </View>

          <View style={styles.labelFooter}>
            <Text style={styles.footerText}>Scan QR code to track or confirm delivery</Text>
            <Text style={styles.footerText}>Created: {new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>📋 Label Information</Text>
          <Text style={styles.instructionText}>• Standard size: 4" x 6" (10cm x 15cm)</Text>
          <Text style={styles.instructionText}>• Attach to package before pickup</Text>
          <Text style={styles.instructionText}>• QR code is scannable for tracking</Text>
          <Text style={styles.instructionText}>• Keep label visible and undamaged</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.printButton]}
            onPress={handlePrint}
            disabled={printing}
          >
            {printing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>🖨️</Text>
                <Text style={styles.buttonText}>Print Label</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.pdfButton]}
            onPress={handleSavePDF}
            disabled={printing}
          >
            {printing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>📄</Text>
                <Text style={styles.buttonText}>Save as PDF</Text>
              </>
            )}
          </TouchableOpacity>
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
  content: { flex: 1, padding: 15 },
  emptyText: { fontSize: 16, color: '#999' },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    borderWidth: 3,
    borderColor: '#ED1C24',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  labelHeader: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#ED1C24',
    paddingBottom: 15,
    marginBottom: 15,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ED1C24',
    marginBottom: 5,
  },
  trackingNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  qrSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  barcodeText: {
    fontFamily: 'monospace',
    fontSize: 14,
    letterSpacing: 2,
    marginTop: 10,
    color: '#333',
  },
  infoSection: {
    marginVertical: 10,
  },
  infoBlock: {
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  infoSubValue: {
    fontSize: 13,
    color: '#666',
  },
  labelFooter: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  instructionCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 13,
    color: '#856404',
    marginBottom: 5,
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  printButton: {
    backgroundColor: '#ED1C24',
  },
  pdfButton: {
    backgroundColor: '#4CAF50',
  },
  buttonIcon: {
    fontSize: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
