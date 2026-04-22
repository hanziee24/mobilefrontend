import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { deliveryAPI } from './api';

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      try {
        await deliveryAPI.updateRiderLocation(
          location.coords.latitude,
          location.coords.longitude
        );
      } catch (err: any) {
        if (err.response?.status === 401) {
          console.log('Auth token expired, stopping background tracking');
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        } else {
          console.error('Failed to update location:', err);
        }
      }
    }
  }
});

export const locationService = {
  async startTracking() {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Foreground location permission denied');
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      throw new Error('Background location permission denied');
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000,
      distanceInterval: 10,
      foregroundService: {
        notificationTitle: 'Delivery Tracking Active',
        notificationBody: 'Your location is being tracked for delivery',
      },
    });
  },

  async stopTracking() {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  },

  async isTracking() {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  },
};
