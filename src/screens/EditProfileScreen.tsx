import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EditProfileScreen: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        // Load existing user data if available
        const loadUserData = async () => {
            try {
                const storedName = await AsyncStorage.getItem('userName');
                const storedEmail = await AsyncStorage.getItem('userEmail');
                if (storedName) setName(storedName);
                if (storedEmail) setEmail(storedEmail);
            } catch (error) {
                console.error('Failed to load user data:', error);
            }
        };

        loadUserData();
    }, []);

    const handleSave = async () => {
        try {
            await AsyncStorage.setItem('userName', name);
            await AsyncStorage.setItem('userEmail', email);
            Alert.alert('Profile Updated', 'Your profile has been updated successfully.');
        } catch (error) {
            console.error('Failed to save user data:', error);
            Alert.alert('Error', 'Failed to update profile.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Edit Profile</Text>
            <TextInput
                style={styles.input}
                placeholder="Name"
                value={name}
                onChangeText={setName}
            />
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
            />
            <TouchableOpacity style={styles.button} onPress={handleSave}>
                <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#F8F8F8',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    button: {
        backgroundColor: '#3A86FF',
        borderRadius: 8,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
        marginBottom: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default EditProfileScreen;
