import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { TasksProvider } from './src/context/TasksContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/components/navigation/AppNavigator';

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <TasksProvider>
                <NavigationContainer>
                    <AppNavigator />
                </NavigationContainer>
            </TasksProvider>
        </ThemeProvider>
    );
};

export default App;
