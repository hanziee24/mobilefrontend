import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

export default function AdminRatingsRedirect() {
  useEffect(() => {
    router.replace('/analytics-dashboard');
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ED1C24" />
      <Text style={styles.text}>Opening reporting dashboard...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
});
