import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BottomTabNavigator from './BottomTabNavigator';
import TaskDetailScreen from '../../screens/TaskDetailScreen';
import SettingsScreen from '../../screens/SettingsScreen';
import AddTaskScreen from '../../screens/AddTaskScreen';
import TaskListScreen from '../../screens/TaskListScreen';
import StudyTimerScreen from '../../screens/StudyTimerScreen';
import EditProfileScreen from '../../screens/EditProfileScreen';  // Import EditProfileScreen

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="BottomTabs"
      screenOptions={{
        headerTintColor: '#42A5F5',
        headerTitleStyle: { color: '#000000' },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomColor: '#E0E0E0',
          borderBottomWidth: 1,
        },
      }}
    >
      <Stack.Screen
        name="BottomTabs"
        component={BottomTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskDetailScreen"
        component={TaskDetailScreen}
        options={{ title: 'Task Details' }}
      />
      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddTaskScreen"
        component={AddTaskScreen}
        options={{ title: 'Add Task' }}
      />
      <Stack.Screen
        name="TaskListScreen"
        component={TaskListScreen}
        options={{ title: 'Task List' }}
      />
      <Stack.Screen
        name="StudyTimerScreen"
        component={StudyTimerScreen}
        options={{ title: 'Study Timer' }}
      />
      <Stack.Screen
        name="EditProfileScreen"
        component={EditProfileScreen}  // Add EditProfileScreen
        options={{ title: 'Edit Profile' }}  // Optional: Customize the header
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
