import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ratingAPI } from '../services/api';

interface PendingDelivery {
  id: number;
  tracking_number: string;
  rider_details?: {
    first_name: string;
    last_name: string;
  };
}

export default function RateRider() {
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDelivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<PendingDelivery | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const PRESET_TIPS = [20, 50, 100];

  useEffect(() => {
    fetchPendingRatings();
  }, []);

  const fetchPendingRatings = async () => {
    try {
      const response = await ratingAPI.getPendingRatings();
      setPendingDeliveries(response.data);
      if (response.data.length > 0) {
        setSelectedDelivery(response.data[0]);
      }
    } catch (error) {
      console.log('Error fetching pending ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }
    if (!selectedDelivery) return;

    const parsedTip = parseFloat(tipAmount);
    if (tipAmount && (isNaN(parsedTip) || parsedTip < 0)) {
      Alert.alert('Invalid Tip', 'Please enter a valid tip amount');
      return;
    }

    setSubmitting(true);
    try {
      await ratingAPI.createRating({
        delivery: selectedDelivery.id,
        rating,
        comment: review || undefined,
        tip_amount: tipAmount ? parsedTip : undefined,
      });
      Alert.alert('Success', 'Thank you for your feedback!', [
        { text: 'OK', onPress: () => {
          setRating(0);
          setReview('');
          setTipAmount('');
          fetchPendingRatings();
        }}
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit rating');
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

  if (pendingDeliveries.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Rate Rider</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyText}>No deliveries to rate</Text>
          <Text style={styles.emptySubtext}>Complete a delivery to rate your rider</Text>
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
        <Text style={styles.title}>Rate Rider</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content}>
        {pendingDeliveries.length > 1 && (
          <View style={styles.deliverySelector}>
            <Text style={styles.selectorLabel}>Select delivery to rate:</Text>
            {pendingDeliveries.map((delivery) => (
              <TouchableOpacity
                key={delivery.id}
                style={[
                  styles.deliveryOption,
                  selectedDelivery?.id === delivery.id && styles.deliveryOptionActive
                ]}
                onPress={() => setSelectedDelivery(delivery)}
              >
                <Text style={styles.deliveryOptionText}>{delivery.tracking_number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedDelivery && (
          <>
            <View style={styles.riderCard}>
              <View style={styles.riderAvatar}>
                <Text style={styles.avatarText}>👤</Text>
              </View>
              <Text style={styles.riderName}>
                {selectedDelivery.rider_details?.first_name} {selectedDelivery.rider_details?.last_name}
              </Text>
              <Text style={styles.orderId}>Order: {selectedDelivery.tracking_number}</Text>
            </View>

            <View style={styles.ratingSection}>
              <Text style={styles.label}>How was your delivery?</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Text style={styles.star}>{star <= rating ? '⭐' : '☆'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.label}>Write a review (optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Share your experience..."
                value={review}
                onChangeText={setReview}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.tipSection}>
              <Text style={styles.label}>Leave a tip (optional)</Text>
              <View style={styles.presetTips}>
                {PRESET_TIPS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetBtn, tipAmount === String(preset) && styles.presetBtnActive]}
                    onPress={() => setTipAmount(tipAmount === String(preset) ? '' : String(preset))}
                  >
                    <Text style={[styles.presetBtnText, tipAmount === String(preset) && styles.presetBtnTextActive]}>₱{preset}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.tipInput}
                placeholder="Or enter custom amount"
                value={tipAmount}
                onChangeText={setTipAmount}
                keyboardType="decimal-pad"
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </>
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
  content: { flex: 1, padding: 15 },
  riderCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  riderAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 40 },
  riderName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  orderId: { fontSize: 14, color: '#666' },
  ratingSection: {
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
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  star: { fontSize: 40 },
  reviewSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
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
  tipSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  presetTips: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  presetBtnActive: { borderColor: '#ED1C24', backgroundColor: '#FFF0F0' },
  presetBtnText: { fontSize: 14, fontWeight: '600', color: '#555' },
  presetBtnTextActive: { color: '#ED1C24' },
  tipInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
  },
  submitButton: {
    backgroundColor: '#ED1C24',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  deliverySelector: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  deliveryOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  deliveryOptionActive: {
    borderColor: '#ED1C24',
    backgroundColor: '#FFF0F0',
  },
  deliveryOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
});
