// src/utils/groupTasksByDate.ts

import { Task } from '../types';

export const groupTasksByDate = (tasks: Task[]): { [date: string]: Task[] } => {
    return tasks.reduce((acc, task) => {
        const date = task.dueDate.split('T')[0];
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(task);
        return acc;
    }, {} as { [date: string]: Task[] });
};
