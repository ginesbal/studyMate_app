import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

export enum ScreenNames {
    HomeScreen = 'HomeScreen',
    TaskDetailScreen = 'TaskDetailScreen',
    AddTaskScreen = 'AddTaskScreen',
    EditProfileScreen = 'EditProfileScreen',
    TaskListScreen = 'TaskListScreen',
    StudyTimerScreen = 'StudyTimerScreen',
    LoginScreen = 'LoginScreen',
    SignupScreen = 'SignupScreen',
    SettingsScreen = 'SettingsScreen',
    BottomTabs = 'BottomTabs'
}

export type RootStackParamList = {
    HomeScreen: undefined;
    TaskDetailScreen: { id: string; onTaskUpdate: (updatedTasks: Task[]) => void };
    AddTaskScreen: { id?: string };
    EditProfileScreen: undefined;
    TaskListScreen: undefined;
    StudyTimerScreen: undefined;
    LoginScreen: undefined;
    SignupScreen: undefined;
    SettingsScreen: undefined;
    BottomTabs: undefined;
};

declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList {}
    }
}

export type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LoginScreen'>;
export type SignupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignupScreen'>;
export type TaskDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TaskDetailScreen'>;
export type TaskDetailScreenRouteProp = RouteProp<RootStackParamList, 'TaskDetailScreen'>;
export type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;
export type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SettingsScreen'>;

export interface Task {
    subject: string;
    id: string;
    title: string;
    description: string;
    dueDate: string;
    reminderTime: string;
    completed: boolean;
    priority: 'Low' | 'Medium' | 'High';
    color: string;
}
