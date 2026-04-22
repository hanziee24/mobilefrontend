import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { deliveryAPI } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

const FAILURE_REASONS = [
  'Receiver not available',
  'Receiver refused to accept',
  'Wrong address',
  'Receiver requested reschedule',
  'Unable to contact receiver',
  'Other',
];

export default function FailedDelivery() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDelivery();
  }, []);

  const fetchDelivery = async () => {
    try {
      const deliveries = await deliveryAPI.getActiveDeliveries();
      const activeDelivery = deliveries.data.find((d: any) => d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT');
      if (activeDelivery) {
        setDelivery(activeDelivery);
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
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a failure reason');
      return;
    }
    if (selectedReason === 'Other' && !customReason.trim()) {
      Alert.alert('Required', 'Please specify the reason');
      return;
    }
    if (!delivery) {
      Alert.alert('Error', 'No active delivery found');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('status', 'FAILED');
      
      const reason = selectedReason === 'Other' ? customReason : selectedReason;
      formData.append('failure_reason', reason);
      
      if (photo) {
        const filename = photo.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('proof_of_delivery', {
          uri: photo,
          name: filename || 'proof.jpg',
          type,
        } as any);
      }
      
      if (notes) {
        formData.append('notes', notes);
      }
      
      await deliveryAPI.submitProofOfDelivery(delivery.id, formData);
      
      const attemptsLeft = (delivery.max_attempts || 3) - (delivery.delivery_attempts || 0) - 1;
      
      if (attemptsLeft > 0) {
        Alert.alert(
          'Failed Delivery Reported',
          `Reason: ${reason}\n\nNext Steps:\n1. Return package to warehouse/hub\n2. Customer will be notified\n3. Delivery will be reattempted tomorrow\n\n✅ ${attemptsLeft} more attempt(s) available`,
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
      } else {
        Alert.alert(
          'Final Attempt Failed',
          `Reason: ${reason}\n\nThis was the final delivery attempt.\n\nNext Steps:\n1. Return package to sender: ${delivery.sender_name}\n2. Contact sender at: ${delivery.sender_contact}\n3. Customer will be notified\n\n⚠️ Package will be returned to sender`,
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit report');
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
          <Text style={styles.title}>Failed Delivery</Text>
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
        <Text style={styles.title}>Failed Delivery</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.orderCard}>
          <Text style={styles.orderId}>{delivery.tracking_number}</Text>
          <Text style={styles.customer}>{delivery.receiver_name}</Text>
          <Text style={styles.address}>{delivery.delivery_address.split('|')[0]}</Text>
          {delivery.delivery_attempts > 0 && (
            <Text style={styles.attemptBadge}>
              Attempt {delivery.delivery_attempts + 1} of {delivery.max_attempts || 3}
            </Text>
          )}
        </View>

        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>📋 What happens next?</Text>
          {(delivery.delivery_attempts || 0) < (delivery.max_attempts || 3) - 1 ? (
            <>
              <Text style={styles.instructionText}>1. Submit this failed delivery report</Text>
              <Text style={styles.instructionText}>2. Return package to warehouse/hub</Text>
              <Text style={styles.instructionText}>3. Customer will be notified</Text>
              <Text style={styles.instructionText}>4. Delivery will be reattempted tomorrow</Text>
              <Text style={styles.instructionHighlight}>
                ✅ {(delivery.max_attempts || 3) - (delivery.delivery_attempts || 0) - 1} more attempt(s) available
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.instructionText}>1. Submit this failed delivery report</Text>
              <Text style={styles.instructionText}>2. Return package to sender</Text>
              <Text style={styles.instructionText}>3. Customer will be notified</Text>
              <Text style={styles.instructionText}>4. This is the final attempt</Text>
              <Text style={styles.instructionWarning}>
                ⚠️ Final attempt - package will be returned to sender
              </Text>
            </>
          )}
        </View>

        <View style={styles.reasonCard}>
          <Text style={styles.label}>⚠️ Failure Reason *</Text>
          {FAILURE_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[styles.reasonOption, selectedReason === reason && styles.selectedReason]}
              onPress={() => setSelectedReason(reason)}
            >
              <Text style={styles.radioIcon}>{selectedReason === reason ? '◉' : '○'}</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </TouchableOpacity>
          ))}
          
          {selectedReason === 'Other' && (
            <TextInput
              style={styles.input}
              placeholder="Specify reason..."
              value={customReason}
              onChangeText={setCustomReason}
              placeholderTextColor="#999"
            />
          )}
        </View>

        <View style={styles.photoCard}>
          <Text style={styles.label}>📸 Photo (Optional)</Text>
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
          <Text style={styles.label}>📝 Additional Notes</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Add any additional details..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {submitting ? 'Submitting...' : 'Report Failed Delivery'}
          </Text>
        </TouchableOpacity>
      </View>
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
  attemptBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyText: { fontSize: 16, color: '#999' },
  instructionCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    paddingLeft: 8,
  },
  instructionHighlight: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
    paddingLeft: 8,
  },
  instructionWarning: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E65100',
    marginTop: 8,
    paddingLeft: 8,
  },
  reasonCard: {
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
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedReason: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  radioIcon: { fontSize: 20, marginRight: 12, color: '#FF9800' },
  reasonText: { fontSize: 15, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
    marginTop: 8,
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
  photoPreview: { alignItems: 'center' },
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
  retakeText: { color: '#fff', fontWeight: '600' },
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
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#ccc' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
