// src/screens/AddTaskScreen.tsx

import React, { useContext, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TasksContext } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList, Task } from '../types';
import PriorityPicker from '../components/pickers/PriorityPicker';
import SubjectPickerDropdown from '../components/pickers/SubjectPickerDropdown';
import ColorPickerDropdown from '../components/pickers/ColorPickerDropdown';
import CustomDatePicker from '../components/pickers/CustomDatePicker';
import CustomReminderTimePicker from '../components/pickers/CustomReminderTimePicker';

type AddTaskScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AddTaskScreen'
>;

const subjects = [
  { name: 'Mathematics', color: '#FFA726' },
  { name: 'Geography', color: '#66BB6A' },
  { name: 'Biology', color: '#42A5F5' },
  { name: 'Physics', color: '#AB47BC' },
  { name: 'Chemistry', color: '#FF7043' },
  { name: 'History', color: '#26C6DA' },
  { name: 'English', color: '#FFCA28' },
  { name: 'Physiology', color: '#EC407A' },
  { name: 'Art', color: '#8D6E63' },
  { name: 'Music', color: '#78909C' },
  { name: 'Economics', color: '#26A69A' },
];

const colors = [
  '#FFA726', '#66BB6A', '#42A5F5', '#AB47BC', '#FF7043',
  '#26C6DA', '#FFCA28', '#EC407A', '#8D6E63', '#78909C',
  '#26A69A', '#FFEB3B', '#795548', '#607D8B', '#F44336'
];

const AddTaskScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<AddTaskScreenNavigationProp>();
  const context = useContext(TasksContext);

  if (!context) {
    throw new Error(
      'TasksContext is undefined, make sure you are using the TasksProvider',
    );
  }

  const { addNewTask } = context;

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [reminderTime, setReminderTime] = useState<string>('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#000000');

  const addTask = async () => {
    if (!title || !dueDate || !selectedSubject) {
      Alert.alert(
        'Validation Error',
        'Title, Due Date, and Subject are required.',
      );
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      title,
      description,
      dueDate,
      reminderTime,
      priority,
      completed: false,
      subject: selectedSubject,
      color: selectedColor,
    };

    try {
      const storedTasks = await AsyncStorage.getItem('tasks');
      const tasks = storedTasks ? JSON.parse(storedTasks) : [];
      tasks.push(newTask);
      await AsyncStorage.setItem('tasks', JSON.stringify(tasks));
      addNewTask(newTask);
      navigation.goBack();
    } catch (error) {
      console.error('Error saving task:', error);
      Alert.alert('Error', 'An error occurred while saving the task.');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Text style={[styles.label, { color: theme.textColor }]}>Choose Color</Text>
      <ColorPickerDropdown colors={colors} selectedColor={selectedColor} setSelectedColor={setSelectedColor} />
      <Text style={[styles.label, { color: theme.textColor }]}>Subject</Text>
      <SubjectPickerDropdown
        subjects={subjects}
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
      />
      <Text style={[styles.label, { color: theme.textColor }]}>Task Title</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: 'transparent', color: theme.textColor },
        ]}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g., Complete Math Homework"
        placeholderTextColor="gray"
      />
      <Text style={[styles.label, { color: theme.textColor }]}>
        Task Description
      </Text>
      <TextInput
        style={[
          styles.input,
          styles.textArea,
          { backgroundColor: 'transparent', color: theme.textColor },
        ]}
        value={description}
        onChangeText={setDescription}
        placeholder="e.g., Solve problems from chapter 5"
        placeholderTextColor="gray"
        multiline
        numberOfLines={4}
      />
      <View style={styles.dateTimeContainer}>
        <View style={styles.dateTimePicker}>
          <CustomDatePicker dueDate={dueDate} onConfirm={setDueDate} />
        </View>
        <View style={styles.dateTimePicker}>
          <CustomReminderTimePicker
            reminderTime={reminderTime}
            onConfirm={setReminderTime}
            placeholder="Set Reminder Time"
          />
        </View>
      </View>
      <Text style={[styles.label, { color: theme.textColor }]}>Priority</Text>
      <PriorityPicker priority={priority} setPriority={setPriority} />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primaryColor }]}
        onPress={addTask}>
        <Text style={[styles.buttonText, { color: theme.buttonTextColor }]}>
          Add Task
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: '5%',
    paddingVertical: 20,
  },
  label: {
    fontSize: 20,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#B7B7A4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateTimePicker: {
    flex: 1,
    marginRight: 10,
    height: 48,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddTaskScreen;
