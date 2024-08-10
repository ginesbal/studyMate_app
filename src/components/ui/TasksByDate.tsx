import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import TaskItem from './TaskItem';
import { Task } from '../../types';

type TasksByDateProps = {
  date: string;
  tasks: Task[];
  onPressTask: (id: string) => void;
};

const TasksByDate: React.FC<TasksByDateProps> = ({ date, tasks, onPressTask }) => {
  const renderTaskItem = ({ item }: { item: Task }) => (
    <TaskItem
      title={item.title}
      dueDate={item.dueDate}
      completed={item.completed}
      onPress={() => onPressTask(item.id)}
    />
  );

  const renderEmptyComponent = () => (
    <Text style={styles.emptyText}>No tasks for this date.</Text>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.date}>{date}</Text>
      <FlatList
        data={tasks}
        renderItem={renderTaskItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={renderEmptyComponent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  date: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#283618',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b6b6b',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default TasksByDate;
