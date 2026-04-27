import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  QrCode,
  Truck,
  UserRound,
} from 'lucide-react-native';

interface Delivery {
  id: number;
  tracking_number: string;
  delivery_address: string;
  delivery_fee: string;
  status: string;
  sender_name?: string;
  sender_contact?: string;
  receiver_name?: string;
  receiver_contact?: string;
}

interface ActiveDeliveryCardProps {
  delivery: Delivery;
  statusLabel: (status: string) => string;
  onPickup: () => void;
  onNavigate: () => void;
  onAdvance: () => void;
  onComplete: () => void;
  onQr: () => void;
  onChat: () => void;
  pickupDisabled?: boolean;
  onPickupDisabled?: () => void;
}

const formatAddressLabel = (value: string) => value?.split('|')[0]?.trim() || value;

const getStatusTone = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { color: '#B45309', bg: '#FEF3C7' };
    case 'OUT_FOR_DELIVERY':
      return { color: '#166534', bg: '#DCFCE7' };
    default:
      return { color: '#1D4ED8', bg: '#DBEAFE' };
  }
};

export default function ActiveDeliveryCard({
  delivery,
  statusLabel,
  onPickup,
  onNavigate,
  onAdvance,
  onComplete,
  onQr,
  onChat,
  pickupDisabled = false,
  onPickupDisabled,
}: ActiveDeliveryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusTone = getStatusTone(delivery.status);
  const addressLabel = formatAddressLabel(delivery.delivery_address);

  const handlePickupPress = () => {
    if (pickupDisabled) {
      onPickupDisabled?.();
      return;
    }
    onPickup();
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.trackingNumber}>#{delivery.tracking_number}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusTone.bg }]}>
            <CircleDot size={11} color={statusTone.color} strokeWidth={2.2} />
            <Text style={[styles.statusPillText, { color: statusTone.color }]}>{statusLabel(delivery.status)}</Text>
          </View>
        </View>
        <Text style={styles.fee}>PHP {delivery.delivery_fee}</Text>
      </View>

      <View style={styles.summaryStack}>
        <View style={styles.summaryRow}>
          <UserRound size={14} color="#666" strokeWidth={2.1} />
          <Text style={styles.summaryLabel}>Receiver</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>{delivery.receiver_name || 'Unknown receiver'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <MapPin size={14} color="#666" strokeWidth={2.1} />
          <Text style={styles.summaryLabel}>Address</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>{addressLabel}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        {delivery.status === 'PENDING' && (
          <TouchableOpacity
            style={[styles.primaryAction, pickupDisabled && styles.disabledAction]}
            onPress={handlePickupPress}
            disabled={pickupDisabled}
          >
            <Truck size={15} color="#fff" strokeWidth={2.4} />
            <Text style={styles.primaryActionText}>Pick Up</Text>
          </TouchableOpacity>
        )}

        {(delivery.status === 'PICKED_UP' || delivery.status === 'IN_TRANSIT') && (
          <>
            <TouchableOpacity style={styles.primaryAction} onPress={onNavigate}>
              <Navigation size={15} color="#fff" strokeWidth={2.4} />
              <Text style={styles.primaryActionText}>Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.warningAction} onPress={onAdvance}>
              <Truck size={15} color="#fff" strokeWidth={2.4} />
              <Text style={styles.primaryActionText}>
                {delivery.status === 'PICKED_UP' ? 'In Transit' : 'Out for Delivery'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {delivery.status === 'OUT_FOR_DELIVERY' && (
          <>
            <TouchableOpacity style={styles.primaryAction} onPress={onNavigate}>
              <Navigation size={15} color="#fff" strokeWidth={2.4} />
              <Text style={styles.primaryActionText}>Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.successAction} onPress={onComplete}>
              <CheckCircle2 size={15} color="#fff" strokeWidth={2.4} />
              <Text style={styles.primaryActionText}>Complete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.footerRow}>
        <View style={styles.quickActionRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={onQr}>
            <QrCode size={18} color="#333" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onChat}>
            <MessageCircle size={18} color="#333" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.detailsToggle} onPress={() => setExpanded((value) => !value)}>
          <Text style={styles.detailsToggleText}>{expanded ? 'Hide details' : 'View details'}</Text>
          {expanded ? (
            <ChevronUp size={16} color="#666" strokeWidth={2.4} />
          ) : (
            <ChevronDown size={16} color="#666" strokeWidth={2.4} />
          )}
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={styles.expandedPanel}>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Sender</Text>
            <Text style={styles.detailValue}>{delivery.sender_name || 'Not available'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Phone size={13} color="#777" strokeWidth={2.1} />
            <Text style={styles.detailValue}>{delivery.sender_contact || 'No phone'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Receiver</Text>
            <Text style={styles.detailValue}>{delivery.receiver_name || 'Not available'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Phone size={13} color="#777" strokeWidth={2.1} />
            <Text style={styles.detailValue}>{delivery.receiver_contact || 'No phone'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <MapPin size={13} color="#777" strokeWidth={2.1} />
            <Text style={styles.detailValueFull}>{addressLabel}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  trackingNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#C62828',
    marginBottom: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fee: {
    fontSize: 17,
    fontWeight: '800',
    color: '#15803D',
  },
  summaryStack: {
    marginTop: 12,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    minWidth: 52,
  },
  summaryValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  primaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  warningAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  successAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  disabledAction: {
    backgroundColor: '#CBD5E1',
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailsToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  expandedPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailKey: {
    width: 58,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  detailValueFull: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    fontWeight: '600',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
});
