import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePushNotifications() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    // Only run on native platforms (Android/iOS via Capacitor)
    if (!Capacitor.isNativePlatform()) return;
    if (!user?.id) return;
    if (registered.current) return;

    const setupPush = async () => {
      try {
        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== 'granted') {
          console.log('Push notification permission not granted');
          return;
        }

        // Register with FCM
        await PushNotifications.register();

        // Listen for the token
        PushNotifications.addListener('registration', async (token) => {
          console.log('FCM Token received:', token.value);
          registered.current = true;

          // Store token in profiles table
          const { error } = await supabase
            .from('profiles')
            .update({ fcm_token: token.value } as any)
            .eq('id', user.id);

          if (error) {
            console.error('Failed to store FCM token:', error);
          } else {
            console.log('FCM token stored successfully');
          }
        });

        // Handle registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        // Handle incoming notifications while app is open
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received in foreground:', notification);
          // You could show a toast here if desired
        });

        // Handle notification tap (deep linking)
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const link = action.notification.data?.link;
          if (link && typeof link === 'string') {
            // Navigate to the deep link path
            window.location.href = link;
          }
        });
      } catch (err) {
        console.error('Push notification setup error:', err);
      }
    };

    setupPush();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user?.id]);
}
