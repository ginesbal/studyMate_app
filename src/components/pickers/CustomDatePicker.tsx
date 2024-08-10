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

interface CustomDueDatePickerProps {
  dueDate: string;
  onConfirm: (date: string) => void;
  onCancel?: () => void;
  isVisible?: boolean;
}

const CustomDatePicker: React.FC<CustomDueDatePickerProps> = ({
  dueDate,
  onConfirm,
}) => {
  const { theme } = useTheme();
  const [isDatePickerVisible, setDatePickerVisibility] = useState<boolean>(false);

  const handleConfirm = (date: Date): void => {
    // Convert to ISO string without the timezone (local time)
    const localDateString = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0] + 'T00:00:00Z';
    onConfirm(localDateString);
    setDatePickerVisibility(false);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setDatePickerVisibility(true)}
        style={[
          styles.datePickerButton,
          { borderColor: theme.borderColor },
        ]}
        accessibilityLabel="Select Due Date"
      >
        <Text style={[styles.datePickerButtonText, { color: theme.textColor }]}>
          {dueDate ? formatDate(dueDate) : 'Select Due Date'}
        </Text>
        <Icon name="arrow-drop-down" size={24} color={theme.textColor} style={styles.toggleIcon} />
      </TouchableOpacity>
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={() => setDatePickerVisibility(false)}
        cancelTextIOS="Cancel"
        confirmTextIOS="Confirm"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 48, // Ensure consistent height
    justifyContent: 'center', // Center content vertically
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    width: '100%',
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleIcon: {
    marginLeft: 8,
  },
});

export default CustomDatePicker;
