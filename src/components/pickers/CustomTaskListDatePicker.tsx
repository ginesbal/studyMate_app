import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';
import { formatDate } from '../../utils/formatDate';

interface CustomDueDatePickerProps {
    dueDate: string;
    onConfirm: (date: string) => void;
    onCancel?: () => void;
}

const CustomTaskListDatePicker: React.FC<CustomDueDatePickerProps> = ({
    dueDate,
    onConfirm,
    onCancel,
}) => {
    const { theme } = useTheme();
    const [isDatePickerVisible, setDatePickerVisibility] = useState<boolean>(false);

    const handleConfirm = (date: Date): void => {
        const utcDate = date.toISOString();
        onConfirm(utcDate);
        setDatePickerVisibility(false);
    };

    const handleCancel = (): void => {
        setDatePickerVisibility(false);
        if (onCancel) {
            onCancel();
        }
    };

    const displayDate = (): string => {
        if (!dueDate) return 'Select Due Date';

        const selectedDate = new Date(dueDate);
        const today = new Date();

        // Check if the selected date is today
        const isToday =
            selectedDate.getDate() === today.getDate() &&
            selectedDate.getMonth() === today.getMonth() &&
            selectedDate.getFullYear() === today.getFullYear();

        return isToday ? 'Today' : formatDate(dueDate);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={() => setDatePickerVisibility(true)}
                style={styles.datePickerButton}
                activeOpacity={0.8}
                accessibilityLabel="Select Due Date"
            >
                <Text style={[styles.datePickerButtonText, { color: theme.textColor }]}>
                    {displayDate()}
                </Text>
                <Icon name="arrow-drop-down-circle" size={28} color={theme.textColor} style={styles.toggleIcon} />
            </TouchableOpacity>
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                cancelTextIOS="Cancel"
                confirmTextIOS="Confirm"
                textColor={theme.textColor}
                locale="en"
                minimumDate={new Date()}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: 100,
        justifyContent: 'center',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 16,
        justifyContent: 'space-between',
        width: '60%',
    },
    datePickerButtonText: {
        fontSize: 30,
        fontWeight: '600',
    },
    toggleIcon: {
        marginLeft: 8,
    },
});

export default CustomTaskListDatePicker;
