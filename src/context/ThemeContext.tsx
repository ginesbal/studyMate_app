import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Theme {
    backgroundColor: string;
    textColor: string;
    buttonBackground: string;
    buttonTextColor: string;
    primaryColor: string;
    secondaryColor: string;
    separatorColor: string;
    inputBackgroundColor: string;
    placeholderTextColor: string;
    errorColor: string;
    borderColor?: string;
}

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    isDarkMode: boolean;
}

// Define the light theme
const lightTheme: Theme = {
    backgroundColor: '#f8f9fa', // light pastel gray
    textColor: '#4a4a4a', // pastel dark gray
    buttonBackground: '#ffd1a9', // pastel orange
    buttonTextColor: '#4a4a4a', // pastel dark gray
    primaryColor: '#a8d5e2',  // pastel blue
    secondaryColor: '#b7a8d5', // pastel purple
    separatorColor: '#e0e0e0', // pastel light gray
    inputBackgroundColor: '#transparent',
    placeholderTextColor: '#cfcfcf', // pastel gray
    errorColor: '#ffb3b3',  // pastel red
    borderColor: '#e0e0e0', // pastel gray border
};

// Define the dark theme
const darkTheme: Theme = {
    backgroundColor: '#2d2d2d', // dark pastel gray
    textColor: '#eaeaea', // light pastel gray
    buttonBackground: '#ffb6b9', // pastel pink
    buttonTextColor: '#2d2d2d', // dark pastel gray
    primaryColor: '#99ccff',  // pastel blue
    secondaryColor: '#c3aed6', // pastel purple
    separatorColor: '#525252', // dark pastel gray
    inputBackgroundColor: '#404040', // dark pastel gray for inputs
    placeholderTextColor: '#757575', // medium pastel gray
    errorColor: '#ff6961',  // pastel red
    borderColor: '#525252', // dark pastel gray border
};

// Create a ThemeContext with an undefined default value
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ThemeProvider component to manage and provide the theme
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const theme = isDarkMode ? darkTheme : lightTheme;

    // Function to toggle between light and dark themes
    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Custom hook to use the theme context
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
