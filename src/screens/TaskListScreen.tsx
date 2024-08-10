import React, { useEffect, useContext, useState, useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Task, RootStackParamList } from '../types';
import { TasksContext } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CustomTaskListDatePicker from '../components/pickers/CustomTaskListDatePicker';
import ScheduleTaskSection from '../components/shared/ScheduleTaskSection';
import Button from '../components/ui/Button';

type TaskListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'TaskListScreen'
>;

const TaskListScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<TaskListScreenNavigationProp>();
  const context = useContext(TasksContext);

  if (!context) {
    throw new Error(
      'TasksContext is undefined, make sure you are using the TasksProvider',
    );
  }

  const { tasks, setTasks } = context;
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'completed' | 'incomplete'
  >('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'Low' | 'Medium' | 'High'>('all');
  const [filterSubject, setFilterSubject] = useState<string[]>(['all']);
  const [filterDate, setFilterDate] = useState<'all' | 'past' | 'today' | 'upcoming'>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const savedTasks = await AsyncStorage.getItem('tasks');
        if (savedTasks) {
          setTasks(JSON.parse(savedTasks));
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setLoading(false);
      }
    };

    fetchTasks();
  }, [setTasks]);

  const handleConfirmDate = (date: string) => {
    setSelectedDate(date);
  };

  const handleDeleteTask = async (taskId: string) => {
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
            const updatedTasks = tasks.filter(task => task.id !== taskId);
            await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
            setTasks(updatedTasks);
          } catch (error) {
            console.error('Error deleting task:', error);
          }
        },
      },
    ]);
  };

  const handleToggleComplete = async (taskId: string) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, completed: !task.completed };
      }
      return task;
    });
    await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
    setTasks(updatedTasks);
  };

  const filterTasks = (
    tasks: Task[],
    status: 'all' | 'completed' | 'incomplete',
    query: string,
    priority: 'all' | 'Low' | 'Medium' | 'High',
    subjects: string[],
    dateFilter: 'all' | 'past' | 'today' | 'upcoming'
  ) => {
    let filtered = tasks;

    if (status !== 'all') {
      filtered = filtered.filter(task =>
        status === 'completed' ? task.completed : !task.completed,
      );
    }

    if (priority !== 'all') {
      filtered = filtered.filter(task => task.priority === priority);
    }

    if (subjects.length && !subjects.includes('all')) {
      filtered = filtered.filter(task => subjects.includes(task.subject));
    }

    if (dateFilter !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      if (dateFilter === 'past') {
        filtered = filtered.filter(task => task.dueDate < today);
      } else if (dateFilter === 'today') {
        filtered = filtered.filter(task => task.dueDate === today);
      } else if (dateFilter === 'upcoming') {
        filtered = filtered.filter(task => task.dueDate > today);
      }
    }

    if (query) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query.toLowerCase()),
      );
    }

    return filtered;
  };

  const filteredTasks = useMemo(
    () => filterTasks(tasks, filterStatus, searchQuery, filterPriority, filterSubject, filterDate),
    [tasks, filterStatus, searchQuery, filterPriority, filterSubject, filterDate]
  );

  const handleFilterSelection = (
    status: 'all' | 'completed' | 'incomplete',
    priority: 'all' | 'Low' | 'Medium' | 'High',
    subjects: string[],
    dateFilter: 'all' | 'past' | 'today' | 'upcoming'
  ) => {
    setFilterStatus(status);
    setFilterPriority(priority);
    setFilterSubject(subjects);
    setFilterDate(dateFilter);
    setFilterModalVisible(false);
  };

  const renderFilterModal = () => (
    <Modal
      transparent={true}
      visible={filterModalVisible}
      animationType="slide"
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundColor }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>Filter By</Text>
            <View style={styles.modalDivider} />
            
            <Text style={[styles.modalLabel, { color: theme.textColor }]}>Status</Text>
            <View style={styles.radioGroup}>
              {['all', 'completed', 'incomplete'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.radioOption,
                    filterStatus === status && { backgroundColor: theme.primaryColor }
                  ]}
                  onPress={() => setFilterStatus(status as 'all' | 'completed' | 'incomplete')}
                >
                  <Icon name={filterStatus === status ? 'radio-button-checked' : 'radio-button-unchecked'} size={24} color={theme.buttonTextColor} />
                  <Text style={[
                    styles.radioOptionText,
                    filterStatus === status && { color: theme.buttonTextColor }
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: theme.textColor }]}>Priority</Text>
            <View style={styles.radioGroup}>
              {['all', 'Low', 'Medium', 'High'].map(priority => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.radioOption,
                    filterPriority === priority && { backgroundColor: theme.primaryColor }
                  ]}
                  onPress={() => setFilterPriority(priority as 'all' | 'Low' | 'Medium' | 'High')}
                >
                  <Icon name={filterPriority === priority ? 'radio-button-checked' : 'radio-button-unchecked'} size={24} color={theme.buttonTextColor} />
                  <Text style={[
                    styles.radioOptionText,
                    filterPriority === priority && { color: theme.buttonTextColor }
                  ]}>
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: theme.textColor }]}>Subject</Text>
            <View style={styles.checkboxGroup}>
              {['all', ...new Set(tasks.map(task => task.subject))].map(subject => (
                <TouchableOpacity
                  key={subject}
                  style={[
                    styles.checkboxOption,
                    filterSubject.includes(subject) && { backgroundColor: theme.primaryColor }
                  ]}
                  onPress={() => {
                    if (subject === 'all') {
                      setFilterSubject(['all']);
                    } else {
                      setFilterSubject(prev =>
                        prev.includes(subject)
                          ? prev.filter(s => s !== subject)
                          : [...prev.filter(s => s !== 'all'), subject]
                      );
                    }
                  }}
                >
                  <Icon name={filterSubject.includes(subject) ? 'check-box' : 'check-box-outline-blank'} size={24} color={theme.buttonTextColor} />
                  <Text style={[
                    styles.checkboxOptionText,
                    filterSubject.includes(subject) && { color: theme.buttonTextColor }
                  ]}>
                    {subject.charAt(0).toUpperCase() + subject.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: theme.textColor }]}>Date</Text>
            <View style={styles.radioGroup}>
              {['all', 'past', 'today', 'upcoming'].map(dateFilter => (
                <TouchableOpacity
                  key={dateFilter}
                  style={[
                    styles.radioOption,
                    filterDate === dateFilter && { backgroundColor: theme.primaryColor }
                  ]}
                  onPress={() => setFilterDate(dateFilter as 'all' | 'past' | 'today' | 'upcoming')}
                >
                  <Icon name={filterDate === dateFilter ? 'radio-button-checked' : 'radio-button-unchecked'} size={24} color={theme.buttonTextColor} />
                  <Text style={[
                    styles.radioOptionText,
                    filterDate === dateFilter && { color: theme.buttonTextColor }
                  ]}>
                    {dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.buttonGroup}>
            <Button
              title="Cancel"
              onPress={() => setFilterModalVisible(false)}
              style={styles.cancelButton}
              textStyle={styles.cancelButtonText}
            />
            <Button
              title="Confirm"
              onPress={() => handleFilterSelection(filterStatus, filterPriority, filterSubject, filterDate)}
              style={{ 
                ...styles.confirmButton, 
                backgroundColor: theme.primaryColor 
              }}
              textStyle={{ 
                ...styles.confirmButtonText, 
                color: theme.buttonTextColor 
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundColor },
        ]}>
        <ActivityIndicator size="large" color={theme.primaryColor} />
      </View>
    );
  }

  const sections = [
    {
      title: 'Past Tasks',
      data: filteredTasks.filter(task => task.dueDate < new Date().toISOString().split('T')[0]),
      emptyMessage: "You have no past tasks.",
      backgroundColor: '#FAFAFA',
      icon: 'history',
    },
    {
      title: "Today's Tasks",
      data: filteredTasks.filter(task => task.dueDate === new Date().toISOString().split('T')[0]),
      emptyMessage: "You have no tasks scheduled for today.",
      backgroundColor: '#F5F5F5',
      icon: 'today',
    },
    {
      title: 'Upcoming Tasks',
      data: filteredTasks.filter(task => task.dueDate > new Date().toISOString().split('T')[0]),
      emptyMessage: "You have no upcoming tasks.",
      backgroundColor: '#EFEFEF',
      icon: 'calendar-today',
    },
  ];

  const renderSection = ({ item }: { item: { title: string, data: Task[], emptyMessage: string, backgroundColor: string, icon: string } }) => (
    <View style={[styles.sectionContainer, { backgroundColor: item.backgroundColor }]}>
      <View style={styles.sectionHeader}>
        <Icon name={item.icon} size={24} color={theme.primaryColor} />
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
          {item.title}
        </Text>
      </View>
      <View style={[styles.separator, { backgroundColor: theme.separatorColor }]} />
      {item.data.length > 0 ? (
        <ScheduleTaskSection tasks={item.data} />
      ) : (
        <Text style={[styles.emptyMessage, { color: theme.placeholderTextColor }]}>
          {item.emptyMessage}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.backgroundColor}
      />
      <View style={styles.searchContainer}>
        <Icon name="search" size={24} color={theme.placeholderTextColor} style={styles.searchIcon} />
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.inputBackgroundColor || 'transparent',
              color: theme.textColor,
              borderColor: theme.placeholderTextColor,
            },
          ]}
          placeholder="Search tasks (e.g., Math Homework)"
          placeholderTextColor={theme.placeholderTextColor}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <View style={styles.headerContainer}>
        <CustomTaskListDatePicker dueDate={selectedDate} onConfirm={handleConfirmDate} />
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={[styles.filterButton, { backgroundColor: theme.primaryColor }]}
        >
          <Text style={[styles.filterButtonText, { color: theme.buttonTextColor }]}>
            Filter
          </Text>
          <Icon name="filter-list" size={24} color={theme.buttonTextColor} />
        </TouchableOpacity>
      </View>
      {renderFilterModal()}
      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={(item) => item.title}
      />
      <Button
        title="Add New Task"
        onPress={() => navigation.navigate('AddTaskScreen', { id: undefined })}
        style={StyleSheet.flatten([
          styles.addButton,
          { backgroundColor: theme.primaryColor },
        ])}
        textStyle={StyleSheet.flatten([
          styles.addButtonText,
          { color: theme.buttonTextColor },
        ])}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  sectionContainer: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 10,
  },
  separator: {
    height: 1,
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    padding: 9,
    borderRadius: 8,
    fontSize: 16,
  },
  addButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    marginTop: 20,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    maxHeight: '80%',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#ddd',
    marginBottom: 20,
  },
  radioGroup: {
    marginBottom: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  radioOptionText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxGroup: {
    marginBottom: 20,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  checkboxOptionText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TaskListScreen;
