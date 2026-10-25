import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { GroupsListScreen } from '../screens/GroupsListScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Welcome">
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ title: 'Sign in', headerShown: false }}
      />
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Gather' }} />
      <Stack.Screen
        name="GroupsList"
        component={GroupsListScreen}
        options={{ title: 'Groups' }}
      />
    </Stack.Navigator>
  );
}
