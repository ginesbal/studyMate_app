import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SignupScreenNavigationProp, ScreenNames } from '../types';
import { useTheme } from '../context/ThemeContext';

const SignupScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<SignupScreenNavigationProp>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSignup = () => {
        if (password === confirmPassword) {
            // Implement signup logic here
            navigation.navigate(ScreenNames.BottomTabs);
        } else {
            // Show error message
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
            <Text style={[styles.title, { color: theme.textColor }]}>Sign Up</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.buttonBackground, color: theme.textColor }]}
                placeholder="Email"
                placeholderTextColor={theme.textColor}
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={[styles.input, { backgroundColor: theme.buttonBackground, color: theme.textColor }]}
                placeholder="Password"
                placeholderTextColor={theme.textColor}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <TextInput
                style={[styles.input, { backgroundColor: theme.buttonBackground, color: theme.textColor }]}
                placeholder="Confirm Password"
                placeholderTextColor={theme.textColor}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
            />
            <TouchableOpacity style={[styles.button, { backgroundColor: theme.primaryColor }]} onPress={handleSignup}>
                <Text style={[styles.buttonText, { color: theme.buttonTextColor }]}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate(ScreenNames.LoginScreen)}>
                <Text style={[styles.linkText, { color: theme.primaryColor }]}>Already have an account? Log in</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
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
        fontSize: 18,
        fontWeight: 'bold',
    },
    linkText: {
        textAlign: 'center',
        marginTop: 10,
    },
});

export default SignupScreen;
