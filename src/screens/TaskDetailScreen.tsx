// src/screens/TaskDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TaskDetailScreenRouteProp, TaskDetailScreenNavigationProp, Task } from '../types';
import { useTheme } from '../context/ThemeContext';

const TaskDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const route = useRoute<TaskDetailScreenRouteProp>();
  const navigation = useNavigation<TaskDetailScreenNavigationProp>();
  const { id, onTaskUpdate } = route.params;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadTask = async () => {
      try {
        const savedTasks = await AsyncStorage.getItem('tasks');
        if (savedTasks) {
          const tasks: Task[] = JSON.parse(savedTasks);
          const foundTask = tasks.find(task => task.id === id);
          if (foundTask) {
            setTask(foundTask);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading task:', error);
        setLoading(false);
      }
    };

    loadTask();
  }, [id]);

  const updateTasksInStorage = async (updatedTasks: Task[]) => {
    try {
      await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
      onTaskUpdate(updatedTasks);
    } catch (error) {
      console.error('Error updating tasks:', error);
    }
  };

  const handleDeleteTask = () => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const savedTasks = await AsyncStorage.getItem('tasks');
            if (savedTasks) {
              const tasks: Task[] = JSON.parse(savedTasks);
              const updatedTasks = tasks.filter(task => task.id !== id);
              await updateTasksInStorage(updatedTasks);
              navigation.goBack();
            }
          } catch (error) {
            console.error('Error deleting task:', error);
          }
        },
      },
    ]);
  };

  const handleMarkAsComplete = () => {
    Alert.alert('Mark as Complete', 'Are you sure you want to mark this task as complete?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            const savedTasks = await AsyncStorage.getItem('tasks');
            if (savedTasks) {
              const tasks: Task[] = JSON.parse(savedTasks);
              const updatedTasks = tasks.map(task => {
                if (task.id === id) {
                  return { ...task, completed: true };
                }
                return task;
              });
              await updateTasksInStorage(updatedTasks);
              navigation.goBack();
            }
          } catch (error) {
            console.error('Error marking task as complete:', error);
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString.split('T')[0] + 'T00:00:00Z');
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primaryColor} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Text style={[styles.title, { color: theme.textColor }]}>{task.title}</Text>
      <Text style={[styles.description, { color: theme.textColor }]}>
        {task.description}
      </Text>
      <Text style={[styles.dueDate, { color: theme.textColor }]}>
        Due Date: {formatDate(task.dueDate)}
      </Text>
      <Text style={[styles.reminderTime, { color: theme.textColor }]}>
        Reminder Time: {task.reminderTime}
      </Text>
      <Text style={[styles.subject, { color: theme.textColor }]}>
        Subject: {task.subject}
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primaryColor }]}
        onPress={handleMarkAsComplete}>
        <Icon name="check-circle" size={24} color={theme.buttonTextColor} />
        <Text style={[styles.buttonText, { color: theme.buttonTextColor }]}>
          Mark as Complete
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primaryColor }]}
        onPress={() => navigation.navigate('AddTaskScreen', { id: task.id })}>
        <Icon name="edit" size={24} color={theme.buttonTextColor} />
        <Text style={[styles.buttonText, { color: theme.buttonTextColor }]}>
          Edit Task
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: theme.errorColor }]}
        onPress={handleDeleteTask}>
        <Icon name="delete" size={24} color={theme.buttonTextColor} />
        <Text style={[styles.deleteButtonText, { color: theme.buttonTextColor }]}>
          Delete Task
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  dueDate: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  reminderTime: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  subject: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
  },
});

export default TaskDetailScreen;
