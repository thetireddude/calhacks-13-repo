import * as Notifications from "expo-notifications";

import type { NotificationPermissionClient } from "./memberSetup";

// Asks the OS for push permission. Any failure is treated as denied: the app (and the in-app
// notification feed) must work without it. Permission values are never logged.
export function createExpoNotificationPermissionClient(): NotificationPermissionClient {
  return {
    request: async () => {
      try {
        const res = await Notifications.requestPermissionsAsync();
        return res.granted ? "granted" : "denied";
      } catch {
        return "denied";
      }
    },
  };
}
