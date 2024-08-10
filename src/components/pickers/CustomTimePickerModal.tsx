import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface CustomTimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (hours: number, minutes: number, seconds: number) => void;
  initialHours: number;
  initialMinutes: number;
  initialSeconds: number;
}

const CustomTimePickerModal: React.FC<CustomTimePickerModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialHours,
  initialMinutes,
  initialSeconds,
}) => {
  const [selectedHours, setSelectedHours] = useState(initialHours);
  const [selectedMinutes, setSelectedMinutes] = useState(initialMinutes);
  const [selectedSeconds, setSelectedSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSelectedHours(initialHours);
    setSelectedMinutes(initialMinutes);
    setSelectedSeconds(initialSeconds);
  }, [initialHours, initialMinutes, initialSeconds]);

  const handleConfirm = () => {
    onConfirm(selectedHours, selectedMinutes, selectedSeconds);
    onClose();
  };

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Select Time</Text>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Hours</Text>
              <Picker
                selectedValue={selectedHours}
                style={styles.picker}
                onValueChange={(itemValue) => setSelectedHours(itemValue)}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <Picker.Item key={i} label={`${i}`} value={i} style={styles.pickerItem} />
                ))}
              </Picker>
            </View>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Minutes</Text>
              <Picker
                selectedValue={selectedMinutes}
                style={styles.picker}
                onValueChange={(itemValue) => setSelectedMinutes(itemValue)}
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <Picker.Item key={i} label={`${i}`} value={i} style={styles.pickerItem} />
                ))}
              </Picker>
            </View>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Seconds</Text>
              <Picker
                selectedValue={selectedSeconds}
                style={styles.picker}
                onValueChange={(itemValue) => setSelectedSeconds(itemValue)}
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <Picker.Item key={i} label={`${i}`} value={i} style={styles.pickerItem} />
                ))}
              </Picker>
            </View>
          </View>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Set Timer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '80%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  picker: {
    width: 100, // Increase the width of the picker
  },
  pickerItem: {
    fontSize: 16,
    textAlign: 'center',
    minWidth: 50, // Ensure minimum width for picker items
  },
  confirmButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomTimePickerModal;
