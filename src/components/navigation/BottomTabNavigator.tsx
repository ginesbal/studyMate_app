import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HomeScreen from '../../screens/HomeScreen';
import TaskListScreen from '../../screens/TaskListScreen';
import StudyTimerScreen from '../../screens/StudyTimerScreen';

const Tab = createBottomTabNavigator();

const BottomTabNavigator: React.FC = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = 'home';
                    } else if (route.name === 'Tasks') {
                        iconName = 'format-list-bulleted';
                    } else if (route.name === 'Timer') {
                        iconName = 'timer';
                    }

                    return <Icon name={iconName ?? ''} size={size} color={color} />;
                },
                tabBarInactiveTintColor: 'gray',
                tabBarActiveTintColor: 'blue',
                tabBarStyle: { backgroundColor: '#FFFFFF' },
                headerShown: false,
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
            <Tab.Screen name="Tasks" component={TaskListScreen} options={{ tabBarLabel: 'Tasks' }} />
            <Tab.Screen name="Timer" component={StudyTimerScreen} options={{ tabBarLabel: 'Timer' }} />
        </Tab.Navigator>
    );
};

export default BottomTabNavigator;
