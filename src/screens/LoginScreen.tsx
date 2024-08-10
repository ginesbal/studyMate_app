import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LoginScreenNavigationProp, ScreenNames } from '../types';
import { useTheme } from '../context/ThemeContext';

const LoginScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<LoginScreenNavigationProp>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = () => {
        // Implement login logic here
        navigation.navigate(ScreenNames.BottomTabs);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
            <Text style={[styles.title, { color: theme.textColor }]}>Login</Text>
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
            <TouchableOpacity style={[styles.button, { backgroundColor: theme.primaryColor }]} onPress={handleLogin}>
                <Text style={[styles.buttonText, { color: theme.buttonTextColor }]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate(ScreenNames.SignupScreen)}>
                <Text style={[styles.linkText, { color: theme.primaryColor }]}>Don't have an account? Sign up</Text>
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

export default LoginScreen;
