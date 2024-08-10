import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList } from 'react-native';
import Modal from 'react-native-modal';

interface SubjectPickerProps {
  subjects: { name: string; color: string }[];
  selectedSubject: string | null;
  setSelectedSubject: (subject: string) => void;
}

const SubjectPickerDropdown: React.FC<SubjectPickerProps> = ({
  subjects,
  selectedSubject,
  setSelectedSubject,
}) => {
  const [isModalVisible, setModalVisible] = React.useState(false);

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  const renderSubjectOption = ({ item }: { item: { name: string; color: string } }) => (
    <TouchableOpacity
      style={styles.subjectOption}
      onPress={() => {
        setSelectedSubject(item.name);
        toggleModal();
      }}
    >
      <Text style={styles.subjectOptionText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleModal} style={styles.subjectPreview}>
        <Text style={styles.selectedSubjectText}>
          {selectedSubject ? selectedSubject : 'Select Subject'}
        </Text>
      </TouchableOpacity>
      <Modal isVisible={isModalVisible} onBackdropPress={toggleModal}>
        <View style={styles.modalContent}>
          <FlatList
            data={subjects}
            keyExtractor={(item) => item.name}
            renderItem={renderSubjectOption}
            numColumns={1}
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
  subjectPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 4,
  },
  selectedSubjectText: {
    fontSize: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
  },
  subjectOption: {
    padding: 15,
    borderRadius: 4,
    margin: 5,
    backgroundColor: 'lightgray',
  },
  subjectOptionText: {
    fontSize: 16,
    color: 'black',
  },
});

export default SubjectPickerDropdown;
