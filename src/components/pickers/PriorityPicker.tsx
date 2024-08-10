import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface PriorityPickerProps {
    priority: 'Low' | 'Medium' | 'High';
    setPriority: (priority: 'Low' | 'Medium' | 'High') => void;
}

const PriorityPicker: React.FC<PriorityPickerProps> = ({ priority, setPriority }) => {
    const { theme } = useTheme();

    return (
        <View style={styles.priorityContainer}>
            {['Low', 'Medium', 'High'].map((level) => (
                <TouchableOpacity
                    key={level}
                    style={[
                        styles.priorityButton,
                        {
                            backgroundColor:
                                priority === level ? theme.primaryColor : theme.inputBackgroundColor,
                        },
                    ]}
                    onPress={() => setPriority(level as 'Low' | 'Medium' | 'High')}>
                    <Text style={[styles.priorityButtonText, { color: theme.buttonTextColor }]}>
                        {level}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    priorityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    priorityButton: {
        flex: 1,
        borderRadius: 8,
        padding: 10,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    priorityButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default PriorityPicker;