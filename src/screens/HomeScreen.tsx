import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList, Task } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ScheduleHomeSection from '../components/shared/ScheduleHomeSection';

type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'HomeScreen'
>;

const HomeScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filter, setFilter] = useState<string>('All');
    const [userName, setUserName] = useState<string | null>(null);

    useEffect(() => {
        const fetchTasksAndUserName = async () => {
            try {
                const savedTasks = await AsyncStorage.getItem('tasks');
                const storedUserName = await AsyncStorage.getItem('userName');

                if (savedTasks) {
                    setTasks(JSON.parse(savedTasks));
                }

                if (storedUserName) {
                    setUserName(storedUserName);
                }
            } catch (error) {
                console.error('Error fetching tasks or user name:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTasksAndUserName();
    }, []);

    const addNewTask = useCallback((newTask: Task) => {
        setTasks((prevTasks) => [...prevTasks, newTask]);
    }, []);

    const getGreeting = useMemo(() => {
        const hour = new Date().getHours();
        let greeting = '🌆 Good evening,';

        if (hour < 12) {
            greeting = '🌅 Good morning,';
        } else if (hour < 18) {
            greeting = '☀️ Good afternoon,';
        }

        if (userName) {
            greeting = `${greeting} ${userName}`;
        }

        return greeting;
    }, [userName]);

    const filteredTasks = useMemo(() => {
        switch (filter) {
            case 'Color':
                return [...tasks].sort((a, b) => a.color.localeCompare(b.color));
            case 'Priority':
                return [...tasks].sort((a, b) => {
                    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                });
            case 'DueDate':
                return [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            default:
                return tasks;
        }
    }, [tasks, filter]);

    return (
        <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor={theme.backgroundColor}
            />
            <View style={styles.headerContainer}>
                <Text style={[styles.headerTitle, { color: theme.textColor }]}>
                    {getGreeting}
                </Text>
                <TouchableOpacity
                    style={[styles.menuButton, { backgroundColor: theme.backgroundColor }]}
                    onPress={() => navigation.navigate('SettingsScreen')}>
                    <Icon name="settings" size={24} color={theme.textColor} />
                </TouchableOpacity>
            </View>

            <View style={styles.sectionSeparator} />

            <View style={styles.filterContainer}>
                {[
                    { label: 'All', icon: 'format-list-bulleted' },
                    { label: 'Color', icon: 'palette' },
                    { label: 'Priority', icon: 'priority-high' },
                    { label: 'DueDate', icon: 'calendar-today' },
                ].map((filterOption) => (
                    <TouchableOpacity
                        key={filterOption.label}
                        style={[
                            styles.filterChip,
                            filter === filterOption.label && styles.activeFilterChip,
                        ]}
                        onPress={() => setFilter(filterOption.label)}
                    >
                        <Icon
                            name={filterOption.icon}
                            size={20}
                            color={filter === filterOption.label ? theme.buttonTextColor : theme.textColor}
                            style={styles.filterChipIcon}
                        />
                        <Text style={[
                            styles.filterChipText,
                            filter === filterOption.label && styles.activeFilterChipText,
                        ]}>
                            {filterOption.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.sectionSeparator} />

            <View style={styles.scheduleHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                    Your Schedule
                </Text>
                <TouchableOpacity
                    style={[
                        styles.viewTasksButton,
                        { backgroundColor: theme.primaryColor },
                    ]}
                    onPress={() => navigation.navigate('TaskListScreen')}>
                    <Text
                        style={[
                            styles.viewTasksButtonText,
                            { color: theme.buttonTextColor },
                        ]}>
                        View Tasks
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator
                    size="large"
                    color={theme.primaryColor}
                    style={styles.loadingIndicator}
                />
            ) : filteredTasks.length > 0 ? (
                <ScheduleHomeSection tasks={filteredTasks} />
            ) : (
                <View style={styles.emptyStateContainer}>
                    <Text style={[styles.emptyStateText, { color: theme.textColor }]}>
                        No tasks available. Tap the '+' button to add a new task.
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primaryColor }]}
                onPress={() => navigation.navigate('AddTaskScreen', { id: undefined })}>
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1E90FF',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        overflow: 'hidden',
    },
    menuButton: {
        borderRadius: 12,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    sectionSeparator: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 10,
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#eee',
    },
    activeFilterChip: {
        backgroundColor: '#ccc',
    },
    filterChipIcon: {
        marginRight: 5,
    },
    filterChipText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    activeFilterChipText: {
        color: '#000',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    scheduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    viewTasksButton: {
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    viewTasksButtonText: {
        fontWeight: 'bold',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 18,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    fabIcon: {
        fontSize: 24,
        color: '#FFF',
    },
    loadingIndicator: {
        marginTop: 20,
    },
});

export default HomeScreen;
