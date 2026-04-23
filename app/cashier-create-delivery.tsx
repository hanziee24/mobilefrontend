import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Image, Share } from 'react-native';
import { router } from 'expo-router';
import { deliveryAPI, settingsAPI } from '../services/api';
import api from '../services/api';
import MapPicker from '../components/MapPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CashierCreateDelivery() {
  const [senderName, setSenderName] = useState('');
  const [senderContact, setSenderContact] = useState('');
  const [senderContactLinked, setSenderContactLinked] = useState<boolean | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [senderContactError, setSenderContactError] = useState('');
  const [receiverContactError, setReceiverContactError] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverContact, setReceiverContact] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [itemType, setItemType] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'g' | 'lbs' | 'oz'>('kg');
  const [quantity, setQuantity] = useState('');
  const [isFragile, setIsFragile] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  type PaymentMethod = 'CASH' | 'GCASH';
  const DIGITAL_METHODS: PaymentMethod[] = ['GCASH'];
  const PAYMENT_LABELS: Record<PaymentMethod, string> = {
    CASH: '💵 Cash',
    GCASH: '📱 GCash',
  };
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountTendered, setAmountTendered] = useState('');
  const [loading, setLoading] = useState(false);
  const [waybill, setWaybill] = useState<any>(null);
  const [feeConfig, setFeeConfig] = useState({ base_fee: 50, per_kg_rate: 15, per_item_rate: 10 });
  const [mapTarget, setMapTarget] = useState<'sender' | 'receiver' | null>(null);
  const [senderLat, setSenderLat] = useState<number | null>(null);
  const [senderLng, setSenderLng] = useState<number | null>(null);
  const [receiverLat, setReceiverLat] = useState<number | null>(null);
  const [receiverLng, setReceiverLng] = useState<number | null>(null);
  const [cashierGcashQr, setCashierGcashQr] = useState<string | null>(null);
  const [digitalConfirmed, setDigitalConfirmed] = useState(false);
  const [digitalAmountReceived, setDigitalAmountReceived] = useState('');
  const [digitalRefNumber, setDigitalRefNumber] = useState('');
  const [feeOverrideEnabled, setFeeOverrideEnabled] = useState(false);
  const [feeOverrideReason, setFeeOverrideReason] = useState('');

  useEffect(() => {
    api.get('/auth/profile/').then(res => {
      if (res.data.gcash_qr) setCashierGcashQr(res.data.gcash_qr);
    }).catch(() => {});
    // Auto-fill from customer delivery request if present
    AsyncStorage.getItem('prefill_delivery_request').then(raw => {
      if (!raw) return;
      const req = JSON.parse(raw);
      setSenderName(req.sender_name || '');
      setSenderContact(req.sender_contact || '');
      setSenderAddress(req.sender_address || '');
      setReceiverName(req.receiver_name || '');
      setReceiverContact(req.receiver_contact || '');
      setReceiverAddress(req.receiver_address || '');
      setItemType(req.item_type || '');
      setWeight(req.weight || '');
      setWeightUnit('kg');
      setQuantity(req.quantity || '');
      setIsFragile(req.is_fragile || false);
      setSpecialInstructions(req.special_instructions || '');
      if (req.preferred_payment_method) setPaymentMethod(req.preferred_payment_method);
    }).catch(() => {});
  }, []);

  const UNIT_TO_KG: Record<string, number> = { kg: 1, g: 0.001, lbs: 0.453592, oz: 0.0283495 };
  const weightInKg = (parseFloat(weight) || 0) * (UNIT_TO_KG[weightUnit] ?? 1);

  useEffect(() => {
    settingsAPI.getFeeConfig().then(res => {
      setFeeConfig({
        base_fee: parseFloat(res.data.base_fee),
        per_kg_rate: parseFloat(res.data.per_kg_rate),
        per_item_rate: parseFloat(res.data.per_item_rate),
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (weight && quantity) {
      const w = weightInKg;
      const q = parseInt(quantity) || 0;
      if (w > 0 && q > 0) {
        const fee = Math.ceil(feeConfig.base_fee + w * feeConfig.per_kg_rate + q * feeConfig.per_item_rate);
        setDeliveryFee(fee.toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weight, quantity, weightUnit, feeConfig.base_fee, feeConfig.per_kg_rate, feeConfig.per_item_rate]);

  const validateContact = (value: string): string => {
    if (!value) return '';
    if (!/^09\d{9}$/.test(value)) return 'Must be 11 digits starting with 09';
    return '';
  };

  const handleSenderContactChange = async (value: string) => {
    setSenderContact(value);
    setSenderContactLinked(null);
    setSenderContactError(validateContact(value));
    if (value.length >= 11) {
      setCheckingPhone(true);
      try {
        const res = await api.get(`/auth/check-phone/?phone=${value}`);
        setSenderContactLinked(res.data.exists);
      } catch {
        setSenderContactLinked(false);
      } finally {
        setCheckingPhone(false);
      }
    }
  };

  const isDigital = DIGITAL_METHODS.includes(paymentMethod);
  const change = paymentMethod === 'CASH'
    ? Math.max(0, (parseFloat(amountTendered) || 0) - (parseFloat(deliveryFee) || 0))
    : 0;

  const handleSubmit = async () => {
    if (!senderName || !senderContact || !senderAddress ||
        !receiverName || !receiverContact || !receiverAddress ||
        !itemType || !weight || !quantity) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    const sErr = validateContact(senderContact);
    const rErr = validateContact(receiverContact);
    if (sErr || rErr) {
      setSenderContactError(sErr);
      setReceiverContactError(rErr);
      Alert.alert('Invalid Contact', 'Contact numbers must be 11 digits starting with 09.');
      return;
    }
    if (paymentMethod === 'CASH' && (parseFloat(amountTendered) || 0) < (parseFloat(deliveryFee) || 0)) {
      Alert.alert('Insufficient', 'Cash given is less than the delivery fee');
      return;
    }
    if (isDigital && !digitalConfirmed) {
      Alert.alert('Payment Not Confirmed', `Please confirm that you have received the ${PAYMENT_LABELS[paymentMethod]} payment before proceeding.`);
      return;
    }
    if (isDigital && (parseFloat(digitalAmountReceived) || 0) < (parseFloat(deliveryFee) || 0)) {
      Alert.alert('Insufficient', `${PAYMENT_LABELS[paymentMethod]} amount received is less than the delivery fee.`);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('sender_name', senderName);
      formData.append('sender_contact', senderContact);
      formData.append('sender_address', senderAddress.split('|')[0] || senderAddress);
      formData.append('receiver_name', receiverName);
      formData.append('receiver_contact', receiverContact);
      formData.append('receiver_address', receiverAddress.split('|')[0] || receiverAddress);
      formData.append('pickup_address', 'Branch Drop-off');
      formData.append('delivery_address', receiverAddress);
      if (receiverLat && receiverLng) {
        formData.append('delivery_latitude', receiverLat.toString());
        formData.append('delivery_longitude', receiverLng.toString());
      }
      if (senderLat && senderLng) {
        formData.append('sender_latitude', senderLat.toString());
        formData.append('sender_longitude', senderLng.toString());
      }
      formData.append('package_details', `${itemType} - ${weightInKg.toFixed(3)}kg - Qty: ${quantity}${isFragile ? ' [FRAGILE]' : ''}`);
      formData.append('delivery_fee', deliveryFee);
      formData.append('pickup_option', 'branch');
      formData.append('is_fragile', isFragile.toString());
      formData.append('payment_method', paymentMethod);
      formData.append('payment_collected', 'true');
      if (isDigital && digitalRefNumber) formData.append('payment_reference', digitalRefNumber);
      if (specialInstructions) formData.append('special_instructions', specialInstructions);

      const res = await deliveryAPI.createDelivery(formData);
      // Mark the delivery request as accepted and clear prefill
      const raw = await AsyncStorage.getItem('prefill_delivery_request');
      if (raw) {
        const req = JSON.parse(raw);
        await deliveryAPI.acceptDeliveryRequest(req.id).catch(() => {});
        await AsyncStorage.removeItem('prefill_delivery_request');
      }
      setWaybill({
        tracking_number: res.data.tracking_number,
        sender_name: senderName,
        sender_contact: senderContact,
        receiver_name: receiverName,
        receiver_contact: receiverContact,
        receiver_address: receiverAddress.split('|')[0] || receiverAddress,
        item_type: itemType,
        weight: weightInKg.toFixed(3),
        quantity,
        is_fragile: isFragile,
        delivery_fee: deliveryFee,
        payment_method: paymentMethod,
        amount_tendered: amountTendered,
        digital_amount_received: digitalAmountReceived,
        digital_ref_number: digitalRefNumber,
        change: change.toFixed(2),
        created_at: new Date().toLocaleString(),
        is_linked: senderContactLinked === true,
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleNewParcel = () => {
    setWaybill(null);
    setSenderName(''); setSenderContact(''); setSenderAddress('');
    setReceiverName(''); setReceiverContact(''); setReceiverAddress('');
    setItemType(''); setWeight(''); setWeightUnit('kg'); setQuantity('');
    setIsFragile(false); setSpecialInstructions('');
    setDeliveryFee(''); setAmountTendered('');
    setPaymentMethod('CASH');
    setDigitalConfirmed(false);
    setDigitalAmountReceived('');
    setDigitalRefNumber('');
    setSenderLat(null); setSenderLng(null);
    setReceiverLat(null); setReceiverLng(null);
    setSenderContactLinked(null);
    setFeeOverrideEnabled(false);
    setFeeOverrideReason('');
  };

  const handleShareReceipt = async (w: typeof waybill) => {
    if (!w) return;
    const paymentLine = w.payment_method === 'CASH'
      ? `Cash Given: ₱${parseFloat(w.amount_tendered).toFixed(2)}\nChange: ₱${w.change}`
      : `Amount Received: ₱${parseFloat(w.digital_amount_received || '0').toFixed(2)}${w.digital_ref_number ? `\nRef No: ${w.digital_ref_number}` : ''}`;
    const text = [
      '📦 DELIVERY RECEIPT',
      `Tracking No: ${w.tracking_number}`,
      `Date: ${w.created_at}`,
      '',
      '📤 SENDER',
      `${w.sender_name} | ${w.sender_contact}`,
      '',
      '📥 RECEIVER',
      `${w.receiver_name} | ${w.receiver_contact}`,
      `📍 ${w.receiver_address}`,
      '',
      '📦 PARCEL',
      `${w.item_type} • ${w.weight}kg • Qty: ${w.quantity}${w.is_fragile ? ' • ⚠️ FRAGILE' : ''}`,
      '',
      '💳 PAYMENT',
      `Delivery Fee: ₱${parseFloat(w.delivery_fee).toFixed(2)}`,
      `Method: ${w.payment_method}`,
      paymentLine,
      '',
      '✅ Payment collected at branch.',
      `Track your parcel using: ${w.tracking_number}`,
    ].join('\n');
    try {
      await Share.share({ message: text, title: 'Delivery Receipt' });
    } catch {}
  };

  // Waybill receipt screen
  if (waybill) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 30 }} />
          <Text style={styles.headerTitle}>Waybill Receipt</Text>
          <View style={{ width: 30 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.waybillCard}>
            <Text style={styles.waybillBrand}>📦 Branch Drop-off</Text>
            <Text style={styles.waybillTracking}>{waybill.tracking_number}</Text>
            <Text style={styles.waybillDate}>{waybill.created_at}</Text>

            <View style={styles.waybillDivider} />

            <Text style={styles.waybillSection}>SENDER</Text>
            <Text style={styles.waybillName}>{waybill.sender_name}</Text>
            <Text style={styles.waybillDetail}>📞 {waybill.sender_contact}</Text>

            <View style={styles.waybillDivider} />

            <Text style={styles.waybillSection}>RECEIVER</Text>
            <Text style={styles.waybillName}>{waybill.receiver_name}</Text>
            <Text style={styles.waybillDetail}>📞 {waybill.receiver_contact}</Text>
            <Text style={styles.waybillDetail}>📍 {waybill.receiver_address}</Text>

            <View style={styles.waybillDivider} />

            <Text style={styles.waybillSection}>PARCEL</Text>
            <Text style={styles.waybillDetail}>{waybill.item_type} • {waybill.weight}kg • Qty: {waybill.quantity}</Text>
            {waybill.is_fragile && (
              <View style={styles.fragileBadge}>
                <Text style={styles.fragileBadgeText}>⚠️ FRAGILE — Handle with Care</Text>
              </View>
            )}

            <View style={styles.waybillDivider} />

            <Text style={styles.waybillSection}>PAYMENT</Text>
            <View style={styles.waybillRow}>
              <Text style={styles.waybillLabel}>Delivery Fee</Text>
              <Text style={styles.waybillFee}>₱{parseFloat(waybill.delivery_fee).toFixed(2)}</Text>
            </View>
            <View style={styles.waybillRow}>
              <Text style={styles.waybillLabel}>Method</Text>
              <Text style={styles.waybillVal}>{waybill.payment_method}</Text>
            </View>
            {waybill.payment_method === 'CASH' && (
              <>
                <View style={styles.waybillRow}>
                  <Text style={styles.waybillLabel}>Cash Given</Text>
                  <Text style={styles.waybillVal}>₱{parseFloat(waybill.amount_tendered).toFixed(2)}</Text>
                </View>
                <View style={styles.waybillRow}>
                  <Text style={styles.waybillLabel}>Change</Text>
                  <Text style={[styles.waybillVal, { color: '#ED1C24', fontWeight: 'bold' }]}>₱{waybill.change}</Text>
                </View>
              </>
            )}
            {waybill.payment_method !== 'CASH' && (
              <>
                <View style={styles.waybillRow}>
                  <Text style={styles.waybillLabel}>Amount Received</Text>
                  <Text style={styles.waybillVal}>₱{parseFloat(waybill.digital_amount_received || '0').toFixed(2)}</Text>
                </View>
                {waybill.digital_ref_number ? (
                  <View style={styles.waybillRow}>
                    <Text style={styles.waybillLabel}>Ref No.</Text>
                    <Text style={styles.waybillVal}>{waybill.digital_ref_number}</Text>
                  </View>
                ) : null}
              </>
            )}

            <View style={styles.waybillDivider} />
            <Text style={styles.waybillFooter}>✅ Payment Collected at Branch</Text>
            <Text style={styles.waybillFooterSub}>Rider will pick up from branch shortly</Text>
            {waybill.is_linked ? (
              <Text style={[styles.waybillFooterSub, { color: '#4CAF50' }]}>✅ Delivery linked to customer’s app account</Text>
            ) : (
              <Text style={styles.waybillFooterSub}>📱 Track using tracking number: {waybill.tracking_number}</Text>
            )}
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={() => handleShareReceipt(waybill)}>
            <Text style={styles.shareBtnText}>📤 Share Receipt with Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newBtn} onPress={handleNewParcel}>
            <Text style={styles.newBtnText}>Accept Another Parcel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/cashier-dashboard')}>
            <Text style={styles.backBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBack}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accept Parcel</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Sender */}
        <Text style={styles.sectionTitle}>📤 Sender Information</Text>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} value={senderName} onChangeText={setSenderName} placeholder="Enter sender name" placeholderTextColor="#999" />
        <Text style={styles.label}>Contact Number *</Text>
        <TextInput style={[styles.input, senderContactError ? styles.inputError : null]} value={senderContact} onChangeText={handleSenderContactChange} placeholder="09XXXXXXXXX" keyboardType="phone-pad" placeholderTextColor="#999" />
        {senderContactError ? <Text style={styles.errorHint}>{senderContactError}</Text> : null}
        {checkingPhone && <Text style={styles.phoneHint}>🔍 Checking...</Text>}
        {!checkingPhone && senderContactLinked === true && (
          <Text style={[styles.phoneHint, { color: '#4CAF50' }]}>✅ Registered — delivery will appear in their app automatically</Text>
        )}
        {!checkingPhone && senderContactLinked === false && senderContact.length >= 11 && (
          <Text style={[styles.phoneHint, { color: '#FF9800' }]}>⚠️ Not registered — customer can still track using the tracking number</Text>
        )}
        <Text style={styles.label}>Address *</Text>
        <TouchableOpacity style={styles.mapPickerBtn} onPress={() => setMapTarget('sender')}>
          <Text style={styles.mapPickerIcon}>📍</Text>
          <Text style={[styles.mapPickerText, !senderAddress && { color: '#999' }]} numberOfLines={2}>
            {senderAddress.split('|')[0] || senderAddress || 'Tap to pick sender location on map'}
          </Text>
        </TouchableOpacity>

        {/* Receiver */}
        <Text style={styles.sectionTitle}>📥 Receiver Information</Text>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} value={receiverName} onChangeText={setReceiverName} placeholder="Enter receiver name" placeholderTextColor="#999" />
        <Text style={styles.label}>Contact Number *</Text>
        <TextInput
          style={[styles.input, receiverContactError ? styles.inputError : null]}
          value={receiverContact}
          onChangeText={v => { setReceiverContact(v); setReceiverContactError(validateContact(v)); }}
          placeholder="09XXXXXXXXX"
          keyboardType="phone-pad"
          placeholderTextColor="#999"
        />
        {receiverContactError ? <Text style={styles.errorHint}>{receiverContactError}</Text> : null}
        <Text style={styles.label}>Delivery Address *</Text>
        <TouchableOpacity style={styles.mapPickerBtn} onPress={() => setMapTarget('receiver')}>
          <Text style={styles.mapPickerIcon}>📍</Text>
          <Text style={[styles.mapPickerText, !receiverAddress && { color: '#999' }]} numberOfLines={2}>
            {receiverAddress.split('|')[0] || receiverAddress || 'Tap to pick delivery location on map'}
          </Text>
        </TouchableOpacity>

        {/* Parcel */}
        <Text style={styles.sectionTitle}>📦 Parcel Details</Text>
        <Text style={styles.label}>Item Type *</Text>
        <TextInput style={styles.input} value={itemType} onChangeText={setItemType} placeholder="e.g. Documents, Clothes, Electronics" placeholderTextColor="#999" />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Weight *</Text>
            <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="0.0" keyboardType="numeric" placeholderTextColor="#999" />
            <View style={styles.unitSelector}>
              {(['kg', 'g', 'lbs', 'oz'] as const).map(u => (
                <TouchableOpacity key={u} style={[styles.unitBtn, weightUnit === u && styles.unitBtnActive]} onPress={() => setWeightUnit(u)}>
                  <Text style={[styles.unitBtnText, weightUnit === u && styles.unitBtnTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} placeholder="1" keyboardType="numeric" placeholderTextColor="#999" />
          </View>
        </View>

        <TouchableOpacity style={[styles.fragileBtn, isFragile && styles.fragileBtnActive]} onPress={() => setIsFragile(!isFragile)}>
          <Text style={[styles.fragileText, isFragile && { color: '#FF9800' }]}>
            {isFragile ? '✅' : '⬜'} Fragile Item — Handle with Care
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Special Instructions (Optional)</Text>
        <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={specialInstructions} onChangeText={setSpecialInstructions} placeholder="e.g. Call before delivery" multiline placeholderTextColor="#999" />

        {/* Fee */}
        <Text style={styles.sectionTitle}>💳 Payment</Text>
        <View style={styles.feeBox}>
          <Text style={styles.feeLabel}>Delivery Fee</Text>
          <TextInput
            style={styles.feeAmountInput}
            value={deliveryFee}
            onChangeText={feeOverrideEnabled ? setDeliveryFee : undefined}
            editable={feeOverrideEnabled}
            keyboardType="numeric"
            placeholderTextColor="#ED1C24"
          />
          <Text style={styles.feeNote}>Base ₱{feeConfig.base_fee} + ₱{feeConfig.per_kg_rate}/kg + ₱{feeConfig.per_item_rate}/item</Text>
        </View>
        <TouchableOpacity
          style={[styles.overrideToggle, feeOverrideEnabled && styles.overrideToggleActive]}
          onPress={() => { setFeeOverrideEnabled(!feeOverrideEnabled); if (feeOverrideEnabled) setFeeOverrideReason(''); }}
        >
          <Text style={[styles.overrideToggleText, feeOverrideEnabled && { color: '#1565C0' }]}>
            {feeOverrideEnabled ? '✏️ Override ON — tap to cancel' : '✏️ Override Fee (cashier adjustment)'}
          </Text>
        </TouchableOpacity>
        {feeOverrideEnabled && (
          <>
            <Text style={styles.label}>Reason for Override *</Text>
            <TextInput
              style={styles.input}
              value={feeOverrideReason}
              onChangeText={setFeeOverrideReason}
              placeholder="e.g. Bulk discount, special arrangement"
              placeholderTextColor="#999"
            />
          </>
        )}

        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.methodGrid}>
          {(['CASH', 'GCASH'] as const).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
              onPress={() => { setPaymentMethod(m); setDigitalConfirmed(false); setDigitalAmountReceived(''); setDigitalRefNumber(''); }}
            >
              <Text style={[styles.methodBtnText, paymentMethod === m && styles.methodBtnTextActive]}>
                {PAYMENT_LABELS[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isDigital && (
          <View style={styles.digitalBox}>
            {paymentMethod === 'GCASH' && (
              cashierGcashQr ? (
                <>
                  <Text style={styles.digitalHint}>📲 Ask customer to scan this GCash QR</Text>
                  <Image source={{ uri: cashierGcashQr }} style={styles.gcashQrImage} resizeMode="contain" />
                </>
              ) : (
                <Text style={styles.digitalHintWarn}>⚠️ No GCash QR uploaded. Please update your profile.</Text>
              )
            )}

            <View style={styles.gcashInputGroup}>
              <Text style={styles.gcashInputLabel}>Amount Received (₱) *</Text>
              <TextInput
                style={styles.gcashInput}
                value={digitalAmountReceived}
                onChangeText={setDigitalAmountReceived}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.gcashInputGroup}>
              <Text style={styles.gcashInputLabel}>Reference / Transaction No. (Optional)</Text>
              <TextInput
                style={styles.gcashInput}
                value={digitalRefNumber}
                onChangeText={setDigitalRefNumber}
                placeholder="e.g. 1234567890"
                keyboardType="default"
                placeholderTextColor="#999"
              />
            </View>
            <TouchableOpacity
              style={[styles.gcashConfirmBtn, digitalConfirmed && styles.gcashConfirmBtnActive]}
              onPress={() => setDigitalConfirmed(!digitalConfirmed)}
            >
              <Text style={styles.gcashConfirmIcon}>{digitalConfirmed ? '✅' : '⬜'}</Text>
              <Text style={[styles.gcashConfirmText, digitalConfirmed && { color: '#2E7D32' }]}>
                I have received the {PAYMENT_LABELS[paymentMethod]} payment
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {paymentMethod === 'CASH' && (
          <>
            <Text style={styles.label}>Cash Given by Customer *</Text>
            <TextInput style={styles.input} value={amountTendered} onChangeText={setAmountTendered} placeholder="0.00" keyboardType="numeric" placeholderTextColor="#999" />
            {amountTendered ? (
              <View style={styles.changeBox}>
                <Text style={styles.changeLabel}>Change</Text>
                <Text style={styles.changeAmount}>₱{change.toFixed(2)}</Text>
              </View>
            ) : null}
          </>
        )}

        <MapPicker
          visible={mapTarget !== null}
          onClose={() => setMapTarget(null)}
          onSelectLocation={(address, lat, lng) => {
            if (mapTarget === 'sender') {
              setSenderAddress(`${address}|${lat},${lng}`);
              setSenderLat(lat);
              setSenderLng(lng);
            } else {
              setReceiverAddress(`${address}|${lat},${lng}`);
              setReceiverLat(lat);
              setReceiverLng(lng);
            }
            setMapTarget(null);
          }}
          initialAddress={(mapTarget === 'sender' ? senderAddress : receiverAddress).split('|')[0]}
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>
            {loading ? 'Processing...' : '✅ Collect Payment & Generate Waybill'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#ED1C24' },
  headerBack: { fontSize: 26, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 15 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#ED1C24', marginTop: 20, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 13, backgroundColor: '#fff', fontSize: 15 },
  mapPickerBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 13, backgroundColor: '#fff', gap: 8, minHeight: 48 },
  mapPickerIcon: { fontSize: 18 },
  mapPickerText: { flex: 1, fontSize: 14, color: '#333' },
  row: { flexDirection: 'row' },
  unitSelector: { flexDirection: 'row', gap: 6, marginTop: 6 },
  unitBtn: { flex: 1, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fff' },
  unitBtnActive: { borderColor: '#ED1C24', backgroundColor: '#FFF0F0' },
  unitBtnText: { fontSize: 12, fontWeight: '600', color: '#888' },
  unitBtnTextActive: { color: '#ED1C24' },
  fragileBtn: { padding: 14, borderRadius: 10, borderWidth: 2, borderColor: '#ddd', backgroundColor: '#fff', marginTop: 10 },
  fragileBtnActive: { borderColor: '#FF9800', backgroundColor: '#FFF3E0' },
  fragileText: { fontSize: 14, fontWeight: '600', color: '#666' },
  feeBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: '#ED1C24' },
  feeLabel: { fontSize: 13, color: '#666', marginBottom: 4 },
  feeAmount: { fontSize: 32, fontWeight: 'bold', color: '#ED1C24', marginBottom: 4 },
  feeNote: { fontSize: 11, color: '#999', fontStyle: 'italic' },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  methodBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fff' },
  methodBtnActive: { borderColor: '#ED1C24', backgroundColor: '#FFF0F0' },
  methodBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
  methodBtnTextActive: { color: '#ED1C24' },
  changeBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginTop: 8 },
  changeLabel: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  changeAmount: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32' },
  digitalBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10, borderWidth: 2, borderColor: '#007AFF' },
  digitalHint: { fontSize: 13, fontWeight: '600', color: '#007AFF', marginBottom: 12, textAlign: 'center' },
  digitalHintWarn: { fontSize: 13, color: '#FF9800', textAlign: 'center', marginBottom: 8 },
  gcashQrImage: { width: 220, height: 220, borderRadius: 8, marginBottom: 8 },
  gcashConfirmBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, backgroundColor: '#f5f5f5', borderRadius: 10, padding: 13, borderWidth: 2, borderColor: '#ddd', width: '100%' },
  gcashConfirmBtnActive: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  gcashConfirmIcon: { fontSize: 18 },
  gcashConfirmText: { fontSize: 14, fontWeight: '600', color: '#666', flex: 1 },
  gcashInputGroup: { width: '100%', marginTop: 12 },
  gcashInputLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  gcashInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 13, backgroundColor: '#f9f9f9', fontSize: 15 },
  phoneHint: { fontSize: 12, color: '#999', marginTop: 4, marginBottom: 4 },
  errorHint: { fontSize: 12, color: '#ED1C24', marginTop: 4, marginBottom: 4 },
  inputError: { borderColor: '#ED1C24' },
  submitBtn: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { backgroundColor: '#ccc' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  // Waybill styles
  waybillCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 2, borderColor: '#ED1C24' },
  waybillBrand: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 6 },
  waybillTracking: { fontSize: 26, fontWeight: 'bold', color: '#ED1C24', textAlign: 'center', letterSpacing: 1, marginBottom: 4 },
  waybillDate: { fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 4 },
  waybillDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  waybillSection: { fontSize: 11, fontWeight: '700', color: '#ED1C24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  waybillName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  waybillDetail: { fontSize: 13, color: '#666', marginBottom: 2 },
  fragileBadge: { backgroundColor: '#FFF3E0', borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#FF9800' },
  fragileBadgeText: { fontSize: 13, fontWeight: '700', color: '#FF9800', textAlign: 'center' },
  waybillRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  waybillLabel: { fontSize: 13, color: '#888' },
  waybillFee: { fontSize: 18, fontWeight: 'bold', color: '#ED1C24' },
  waybillVal: { fontSize: 13, fontWeight: '600', color: '#333' },
  waybillFooter: { fontSize: 14, fontWeight: 'bold', color: '#4CAF50', textAlign: 'center', marginTop: 4 },
  waybillFooterSub: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 4 },
  newBtn: { backgroundColor: '#ED1C24', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  newBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  shareBtn: { backgroundColor: '#1565C0', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  backBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  backBtnText: { color: '#666', fontSize: 15, fontWeight: '600' },
  feeAmountInput: { fontSize: 32, fontWeight: 'bold', color: '#ED1C24', marginBottom: 4, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#ED1C24', minWidth: 120 },
  overrideToggle: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f9f9f9', alignItems: 'center', marginBottom: 10 },
  overrideToggleActive: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  overrideToggleText: { fontSize: 13, fontWeight: '600', color: '#888' },
});
