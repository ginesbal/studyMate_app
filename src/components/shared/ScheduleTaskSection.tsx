import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { RootStackParamList, Task } from '../../types';
import { groupTasksByDate } from '../../utils/groupTasksByDate';

type TaskListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'TaskListScreen'
>;

interface ScheduleSectionProps {
  tasks: Task[];
}

const ScheduleTaskSection: React.FC<ScheduleSectionProps> = ({ tasks }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<TaskListScreenNavigationProp>();


  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);


  const groupedTasks = useMemo(() => groupTasksByDate(localTasks), [localTasks]);


  const sections = useMemo(
    () =>
      Object.keys(groupedTasks).map(date => ({
        title: date,
        data: groupedTasks[date],
      })),
    [groupedTasks]
  );

  const handleTaskUpdate = (updatedTasks: Task[]) => {
    setLocalTasks(updatedTasks);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString.split('T')[0] + 'T00:00:00Z');
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  }


  const formatDate2 = (dateString: string): string => {
    const date = new Date(dateString.split('T')[0] + 'T00:00:00Z');
    const options: Intl.DateTimeFormatOptions = { day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  }


  const renderTaskItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('TaskDetailScreen', { id: item.id, onTaskUpdate: handleTaskUpdate })}>
      <View
        style={[
          styles.taskContainer,
          { backgroundColor: item.color || theme.buttonBackground },
        ]}>
        <View style={[styles.dateContainer]}>
          <Text style={[styles.dateText]}>
            {formatDate2(item.dueDate)}
          </Text>
        </View>
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, { color: theme.buttonTextColor }]}>
            {item.title}
          </Text>
          <Text style={[styles.taskSubject, { color: theme.buttonTextColor }]}>
            {item.subject}
          </Text>
          <Text style={[styles.taskDueDate, { color: theme.buttonTextColor }]}>
            Due: {formatDate(item.dueDate)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={sections}
      keyExtractor={(item) => item.title}
      contentContainerStyle={{ paddingTop: 20 }}
      renderItem={({ item }) => (
        <View style={styles.sectionContainer}>
          <FlatList
            data={item.data}
            renderItem={renderTaskItem}
            keyExtractor={(task) => task.id}
          />
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 10,
  },
  dateContainer: {
    padding: 8,
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    backgroundColor: 'white',
    borderColor: '#FFDAB9',
    borderWidth: 2,
  },
  dateText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#696969',
  },
  taskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  taskContent: {
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: 'white',
    paddingLeft: 10,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  taskSubject: {
    fontSize: 14,
    marginTop: 2,
    marginBottom: 2,
    color: '#888',
    fontWeight: 'bold',
  },
  taskDueDate: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ScheduleTaskSection;
