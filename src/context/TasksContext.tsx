// src/context/TasksContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types';

interface TasksContextType {
    tasks: Task[];
    loading: boolean;
    error: string | null;
    addNewTask: (newTask: Task) => void;
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const TasksContext = createContext<TasksContextType>({
    tasks: [],
    loading: true,
    error: null,
    addNewTask: () => {},
    setTasks: () => {},
});

interface TasksProviderProps {
    children: ReactNode;
}

export const TasksProvider: React.FC<TasksProviderProps> = ({ children }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const savedTasks = await AsyncStorage.getItem('tasks');
                if (savedTasks) {
                    setTasks(JSON.parse(savedTasks));
                }
            } catch (error) {
                setError('Error fetching tasks. Please try again later.');
                console.error('Error fetching tasks:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, []);

    const addNewTask = useCallback((newTask: Task) => {
        setTasks((prevTasks) => [...prevTasks, newTask]);
    }, []);

    return (
        <TasksContext.Provider value={{ tasks, loading, error, addNewTask, setTasks }}>
            {children}
        </TasksContext.Provider>
    );
};

export const useTasks = (): TasksContextType => {
    const context = useContext(TasksContext);
    if (context === undefined) {
        throw new Error('useTasks must be used within a TasksProvider');
    }
    return context;
};

export { TasksContext };
export type { TasksContextType };
