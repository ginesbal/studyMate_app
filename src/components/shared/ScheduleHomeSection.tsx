import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Task } from '../../types';
import { groupTasksByDate } from '../../utils/groupTasksByDate';
import { useTheme } from '../../context/ThemeContext';

type TaskListScreenNavigationProp = StackNavigationProp<
    RootStackParamList,
    'TaskListScreen'
>;

interface ScheduleSectionProps {
    tasks: Task[];
}

const ScheduleHomeSection: React.FC<ScheduleSectionProps> = ({ tasks }) => {
    const { theme } = useTheme();
    const navigation = useNavigation<TaskListScreenNavigationProp>();

    const [localTasks, setLocalTasks] = useState(tasks);

    const groupedTasks = useMemo(() => groupTasksByDate(localTasks), [localTasks]);

    const sections = useMemo(
        () =>
            Object.keys(groupedTasks).map(date => ({
                title: date,
                data: groupedTasks[date],
            })),
        [groupedTasks]
    );

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString.split('T')[0] + 'T00:00:00Z');
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString(undefined, options);
    }

    const formatDate2 = (dateString: string): string => {
        const date = new Date(dateString.split('T')[0] + 'T00:00:00Z');
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString(undefined, options);
    }

    const handleTaskUpdate = (updatedTasks: Task[]) => {
        setLocalTasks(updatedTasks);
    };

    const renderTaskItem = ({ item }: { item: Task }) => (
        <TouchableOpacity
            onPress={() => navigation.navigate('TaskDetailScreen', { id: item.id, onTaskUpdate: handleTaskUpdate })}>
            <View
                style={[
                    styles.taskContainer,
                    { backgroundColor: item.color || theme.buttonBackground },
                ]}>
                <Text style={[styles.taskTitle, { color: theme.buttonTextColor }]}>
                    {item.title}
                </Text>
                <Text style={[styles.taskDueDate, { color: theme.buttonTextColor }]}>
                    Due: {formatDate(item.dueDate)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <FlatList
            data={sections}
            keyExtractor={(item) => item.title}
            contentContainerStyle={{ paddingTop: 20 }}
            renderItem={({ item }) => (
                <View style={styles.sectionContainer}>
                    <View style={styles.dateContainer}>
                        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                            {formatDate2(item.title)}
                        </Text>
                    </View>
                    <FlatList
                        data={item.data}
                        renderItem={renderTaskItem}
                        keyExtractor={(task) => task.id}
                    />
                </View>
            )}
        />
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        marginBottom: 5,
        marginTop: -20,
    },
    dateContainer: {
        backgroundColor: '#e0e2e2',
        padding: 8,
        paddingRight: 30,
        borderRadius: 4,
        alignSelf: 'flex-start',
        zIndex: 2,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: -20, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    taskContainer: {
        borderRadius: 8,
        padding: 20,
        paddingBottom: 30,
        paddingTop: 10,
        marginBottom: 1
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    taskDueDate: {
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default ScheduleHomeSection;
