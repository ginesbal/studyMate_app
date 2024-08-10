import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface CustomSubjectPickerProps {
    selectedSubject: string | null;
    onSelect: (subject: string) => void;
}

const subjects = ["Mathematics", "Geography", "Biology", "Physics", "Chemistry"];

const CustomSubjectPicker: React.FC<CustomSubjectPickerProps> = ({ selectedSubject, onSelect }) => {
    const { theme } = useTheme();

    return (
        <View>
            <Text style={[styles.label, { color: theme.textColor }]}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectsContainer}>
                {subjects.map((subject, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.subjectBox,
                            selectedSubject === subject ? styles.selectedSubjectBox : {},
                            { backgroundColor: selectedSubject === subject ? theme.secondaryColor : theme.primaryColor },
                        ]}
                        onPress={() => onSelect(subject)}
                    >
                        <Text style={[styles.subjectText, { color: theme.buttonTextColor }]}>{subject}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    label: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: '600',
    },
    subjectsContainer: {
        marginBottom: 20,
    },
    subjectBox: {
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        width: 150,
        height: 80,
    },
    selectedSubjectBox: {
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    subjectText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CustomSubjectPicker;
