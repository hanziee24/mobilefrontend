import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ED1C24',
      });
    }

    return token;
  },

  async savePushToken(userId: number, token: string) {
    try {
      await api.post(`/auth/${userId}/push-token/`, { push_token: token });
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  },

  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationTapped: (response: Notifications.NotificationResponse) => void
  ) {
    const receivedListener = Notifications.addNotificationReceivedListener(onNotificationReceived);
    const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationTapped);

    return () => {
      receivedListener.remove();
      responseListener.remove();
    };
  },

  async scheduleLocalNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null,
    });
  },
};
