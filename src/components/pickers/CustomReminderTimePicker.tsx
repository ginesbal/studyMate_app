import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import Modal from 'react-native-modal';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface CustomReminderTimePickerProps {
    reminderTime: string;
    onConfirm: (time: string) => void;
    placeholder?: string;
}

const generateTimes = () => {
    const times = [];
    for (let i = 0; i < 24; i++) {
        const hour = String(i).padStart(2, '0');
        times.push(`${hour}:00`);
    }
    return times;
};

const CustomReminderTimePicker: React.FC<CustomReminderTimePickerProps> = ({ reminderTime, onConfirm, placeholder = 'Set Reminder Time' }) => {
    const { theme } = useTheme();
    const [isTimePickerVisible, setTimePickerVisibility] = useState(false);

    const times = generateTimes();

    const handleConfirm = (time: string) => {
        onConfirm(time);
        setTimePickerVisibility(false);
    };

    const renderTimeOption = ({ item }: { item: string }) => (
        <TouchableOpacity style={styles.timeOption} onPress={() => handleConfirm(item)}>
            <Text style={[styles.timeText, { color: theme.textColor }]}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.inputBackgroundColor, borderColor: theme.borderColor }]}>
            <TouchableOpacity onPress={() => setTimePickerVisibility(true)} style={styles.pickerButton}>
                <Text style={[styles.pickerButtonText, { color: theme.textColor }]}>
                    {reminderTime || placeholder}
                </Text>
                <Icon name="arrow-drop-down" size={24} color={theme.textColor} />
            </TouchableOpacity>
            <Modal isVisible={isTimePickerVisible} onBackdropPress={() => setTimePickerVisibility(false)}>
                <View style={[styles.modalContent, { backgroundColor: theme.backgroundColor }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.textColor }]}>Select Reminder Time</Text>
                        <TouchableOpacity onPress={() => setTimePickerVisibility(false)}>
                            <Icon name="close" size={24} color={theme.textColor} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={times}
                        keyExtractor={(item) => item}
                        renderItem={renderTimeOption}
                        ItemSeparatorComponent={() => <View style={[styles.separator, { borderColor: theme.borderColor }]} />}
                    />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        width: '100%',
        height: 48, // Ensure consistent height
        justifyContent: 'center', // Center content vertically
    },
    pickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        height: '100%', // Ensure full height is utilized
    },
    pickerButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    modalContent: {
        maxHeight: 400,
        padding: 20,
        borderRadius: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    timeOption: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    timeText: {
        fontSize: 16,
    },
    separator: {
        borderBottomWidth: 1,
    },
});

export default CustomReminderTimePicker;
