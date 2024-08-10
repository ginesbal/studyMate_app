import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface SubjectListProps {
    subjectStyles: { [key: string]: { backgroundColor: string } };
}

const SubjectList: React.FC<SubjectListProps> = ({ subjectStyles }) => {
    const { theme } = useTheme();

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectsContainer}>
            {["Mathematics", "Geography", "Biology", "Physics", "Chemistry"].map((subject, index) => (
                <TouchableOpacity key={index} style={[styles.subjectBox, subjectStyles[subject.toLowerCase()]]}>
                    <Text style={[styles.subjectText, { color: theme.buttonTextColor }]}>{subject}</Text>
                    <TouchableOpacity style={styles.subjectMenuButton}>
                        <Text style={[styles.subjectMenuButtonText, { color: theme.buttonTextColor }]}>⋮</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
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
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    subjectText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    subjectMenuButton: {
        position: 'absolute',
        top: 5,
        right: 5,
    },
    subjectMenuButtonText: {
        fontSize: 18,
    },
});

export default SubjectList;
