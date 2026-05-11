import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const GREEN = '#2e7d32';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: '#888',
        headerStyle: { backgroundColor: GREEN },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Plants',
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf" size={size} color={color} />,
          headerTitle: 'Plantopia',
        }}
      />
      <Tabs.Screen
        name="my-plants"
        options={{
          title: 'My Plants',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
          headerTitle: 'My Plants',
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: 'Flora AI',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" size={size} color={color} />,
          headerTitle: 'Flora - Plant AI',
        }}
      />
      <Tabs.Screen
        name="identify"
        options={{
          title: 'Identify',
          tabBarIcon: ({ color, size }) => <Ionicons name="camera" size={size} color={color} />,
          headerTitle: 'Identify Plant',
        }}
      />
      <Tabs.Screen
        name="ar"
        options={{
          title: 'AR View',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube" size={size} color={color} />,
          headerTitle: 'AR Plant View',
        }}
      />
    </Tabs>
  );
}
