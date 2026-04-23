import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { notificationAPI } from '../services/api';

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications();
      setNotifications(response.data);
    } catch (error: any) {
      if (error.response?.status !== 403 && error.response?.status !== 401) {
        console.log('Error fetching notifications:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Mark All Read', 
          onPress: async () => {
            try {
              await notificationAPI.markAllRead();
              fetchNotifications();
              Alert.alert('Success', 'All notifications marked as read');
            } catch (_error) {
              Alert.alert('Error', 'Failed to mark notifications as read');
            }
          }
        }
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationAPI.clearAll();
              fetchNotifications();
              Alert.alert('Success', 'All notifications cleared');
            } catch (_error) {
              Alert.alert('Error', 'Failed to clear notifications');
            }
          }
        }
      ]
    );
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.actionBtn}>
            <Text style={styles.markReadText}>✓ Read</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearAll} style={styles.actionBtn}>
            <Text style={styles.clearText}>🗑️ Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 50 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔕</Text>
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>You&apos;re all caught up!</Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={[styles.notifCard, !notif.is_read && styles.unread]}
              onPress={async () => {
                if (!notif.is_read) {
                  setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                  notificationAPI.markRead(notif.id).catch(() => {});
                }
              }}
            >
              <View style={styles.notifIcon}>
                <Text style={styles.iconText}>🔔</Text>
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>{notif.title}</Text>
                <Text style={styles.notifMessage}>{notif.message}</Text>
                <Text style={styles.notifTime}>{getTimeAgo(notif.created_at)}</Text>
              </View>
              {!notif.is_read && <View style={styles.badge} />}
            </TouchableOpacity>
          ))
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markReadText: { 
    fontSize: 13, 
    color: '#4CAF50',
    fontWeight: '600',
  },
  clearText: { 
    fontSize: 13, 
    color: '#ED1C24',
    fontWeight: '600',
  },
  content: { flex: 1, padding: 15 },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unread: { backgroundColor: '#FFF8F8' },
  notifIcon: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 20 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  notifMessage: { fontSize: 13, color: '#666', marginBottom: 6 },
  notifTime: { fontSize: 11, color: '#999' },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ED1C24',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});
