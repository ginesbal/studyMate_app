import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ScheduleHeaderProps {
    onViewTasksPress: () => void;
}

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({ onViewTasksPress }) => {
    const { theme } = useTheme();

    return (
        <View style={styles.scheduleHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Your Schedule</Text>
            <TouchableOpacity
                style={[styles.viewTasksButton, { backgroundColor: theme.primaryColor }]}
                onPress={onViewTasksPress}
                accessibilityLabel="View Tasks Button"
                accessibilityRole="button"
            >
                <Text style={[styles.viewTasksButtonText, { color: theme.buttonTextColor }]}>View Tasks</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    scheduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    viewTasksButton: {
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    viewTasksButtonText: {
        fontWeight: 'bold',
    },
});

export default ScheduleHeader;
