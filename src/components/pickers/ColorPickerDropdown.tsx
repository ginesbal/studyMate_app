import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList } from 'react-native';
import Modal from 'react-native-modal';

interface ColorPickerProps {
  colors: string[];
  selectedColor: string;
  setSelectedColor: (color: string) => void;
}

const ColorPickerDropdown: React.FC<ColorPickerProps> = ({ colors, selectedColor, setSelectedColor }) => {
  const [isModalVisible, setModalVisible] = React.useState(false);

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  const renderColorOption = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.colorOption,
        { backgroundColor: item },
        selectedColor === item && styles.selectedBorder, // Highlight the selected color
      ]}
      onPress={() => {
        setSelectedColor(item);
        toggleModal();
      }}
      accessibilityLabel={`Select ${item} color`}
    />
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleModal} style={styles.colorPreview} accessibilityLabel="Open color picker">
        <View style={[styles.selectedColorPreview, { backgroundColor: selectedColor }]} />
        <Text style={styles.selectedColorText}>Select Color</Text>
      </TouchableOpacity>
      <Modal isVisible={isModalVisible} onBackdropPress={toggleModal} animationIn="slideInUp" animationOut="slideOutDown">
        <View style={styles.modalContent}>
          <FlatList
            data={colors}
            keyExtractor={(item) => item}
            renderItem={renderColorOption}
            numColumns={5}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 4,
  },
  selectedColorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  selectedColorText: {
    fontSize: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 10,
  },
  selectedBorder: {
    borderWidth: 2,
    borderColor: 'black', // You can choose another color to highlight
  },
});

export default ColorPickerDropdown;
