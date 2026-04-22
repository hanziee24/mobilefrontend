import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { deliveryAPI } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

export default function ProofOfDelivery() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'success' | 'failed' | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchDelivery();
  }, [id]);

  const fetchDelivery = async () => {
    try {
      if (id) {
        const res = await deliveryAPI.getDelivery(Number(id));
        setDelivery(res.data);
      } else {
        const deliveries = await deliveryAPI.getActiveDeliveries();
        const activeDelivery = deliveries.data.find((d: any) =>
          d.status === 'OUT_FOR_DELIVERY' || d.status === 'IN_TRANSIT' || d.status === 'PICKED_UP'
        );
        if (activeDelivery) setDelivery(activeDelivery);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!photo) {
      Alert.alert('Required', 'Please take a photo of the delivery');
      return;
    }
    if (!delivery) {
      Alert.alert('Error', 'No active delivery found');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('status', 'DELIVERED');
      
      const filename = (photo.split('/').pop() || 'proof.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
      const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpeg';
      const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const type = allowedExts.includes(ext) ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'image/jpeg';
      
      formData.append('proof_of_delivery', {
        uri: photo,
        name: filename,
        type,
      } as any);
      
      if (notes) {
        formData.append('notes', notes);
      }
      
      await deliveryAPI.submitProofOfDelivery(delivery.id, formData);
      router.replace('/rider-dashboard?tab=home');
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit proof');
    } finally {
      setSubmitting(false);
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
          <Text style={styles.title}>Proof of Delivery</Text>
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
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Proof of Delivery</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView ref={scrollRef} style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.orderCard}>
          <Text style={styles.orderId}>{delivery.tracking_number}</Text>
          <Text style={styles.customer}>{delivery.receiver_name}</Text>
          <Text style={styles.address}>{delivery.delivery_address.split('|')[0]}</Text>
        </View>

        <View style={styles.actionChoiceCard}>
          <Text style={styles.choiceTitle}>Choose Action</Text>
          <Text style={styles.choiceSubtitle}>Select how you want to complete this delivery</Text>
          
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.successChoiceBtn, mode === 'success' && styles.choiceBtnSelected]}
              onPress={() => {
                setMode('success');
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
              }}
            >
              <Text style={styles.choiceIcon}>✅</Text>
              <Text style={styles.choiceBtnTitle}>Successful Delivery</Text>
              <Text style={styles.choiceBtnDesc}>Package delivered to receiver</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.failedChoiceBtn, mode === 'failed' && styles.choiceBtnSelected]}
              onPress={() => router.push({ pathname: '/failed-delivery', params: { id: delivery?.id ? String(delivery.id) : '' } } as any)}
            >
              <Text style={styles.choiceIcon}>⚠️</Text>
              <Text style={styles.choiceBtnTitle}>Failed Delivery</Text>
              <Text style={styles.choiceBtnDesc}>Receiver not available</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.photoCard}>
          <Text style={styles.label}>📸 Delivery Photo *</Text>
          {photo ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photo }} style={styles.photoImage} />
              <TouchableOpacity style={styles.retakeBtn} onPress={handleTakePhoto}>
                <Text style={styles.retakeText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.notesCard}>
          <Text style={styles.label}>📝 Delivery Notes (Optional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Add any special notes or instructions..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />
        </View>

        {mode === 'success' && (
          <TouchableOpacity 
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitText}>
              {submitting ? 'Submitting...' : '✅ Complete Delivery'}
            </Text>
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
  backButton: { fontSize: 28, color: '#333' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  content: { flex: 1 },
  contentContainer: { padding: 15, paddingBottom: 30 },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderId: { fontSize: 18, fontWeight: 'bold', color: '#ED1C24', marginBottom: 5 },
  customer: { fontSize: 16, color: '#666', marginBottom: 3 },
  address: { fontSize: 13, color: '#999', textAlign: 'center' },
  emptyText: { fontSize: 16, color: '#999' },
  actionChoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  choiceSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  buttonGroup: {
    gap: 8,
  },
  successChoiceBtn: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  failedChoiceBtn: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  choiceIcon: {
    fontSize: 15,
    marginBottom: 4,
  },
  choiceBtnTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  choiceBtnDesc: {
    fontSize: 11,
    color: '#666',
  },
  choiceBtnSelected: {
    borderWidth: 3,
  },
  photoCard: {
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
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 15 },
  photoButton: {
    backgroundColor: '#E3F2FD',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  cameraIcon: { fontSize: 48, marginBottom: 10 },
  photoButtonText: { fontSize: 16, fontWeight: '600', color: '#2196F3' },
  photoPreview: {
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  retakeBtn: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retakeText: {
    color: '#fff',
    fontWeight: '600',
  },
  notesCard: {
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
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
