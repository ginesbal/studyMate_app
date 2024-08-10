// TaskManager.tsx
import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import CustomDatePicker from '../pickers/CustomDatePicker'; // Import your CustomDatePicker

const TaskManager: React.FC = () => {
    const [dueDate, setDueDate] = useState<string>(''); // State to store the selected date

    const handleConfirm = (selectedDate: string) => {
        setDueDate(selectedDate); // Update the due date state when a date is selected
    };

    const handleAddTask = () => {
        // Logic to add a task, you can replace this with your own logic
        if (dueDate) {
            console.log(`Task added with due date: ${new Date(dueDate).toLocaleDateString()}`);
        } else {
            console.log('Please select a due date');
        }
    };

    return (
        <View style={{ padding: 20 }}>
            <CustomDatePicker dueDate={dueDate} onConfirm={handleConfirm} />
            <Button title="Add Task" onPress={handleAddTask} />
            {dueDate && (
                <Text style={{ marginTop: 20 }}>
                    Selected Due Date: {new Date(dueDate).toLocaleDateString()}
                </Text>
            )}
        </View>
    );
};

export default TaskManager;
