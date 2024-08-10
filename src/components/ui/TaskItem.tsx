// src/components/ui/TaskItem.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface TaskItemProps {
    title: string;
    dueDate: string;
    completed: boolean;
    onPress: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ title, dueDate, completed, onPress }) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.content}>
                <View style={styles.dateCircle}>
                    <Text style={styles.dateText}>{new Date(dueDate).getDate()}</Text>
                </View>
                <View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{completed ? 'Completed' : 'Pending'}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3A86FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    dateText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E1E2E',
    },
    subtitle: {
        fontSize: 14,
        color: '#A0A0A0',
    },
});

export default TaskItem;
