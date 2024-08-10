import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
    greeting: string;
    onSettingsPress: () => void;
}

const Header: React.FC<HeaderProps> = ({ greeting, onSettingsPress }) => {
    const { theme } = useTheme();

    return (
        <View style={styles.headerContainer}>
            <Text style={[styles.headerTitle, { color: theme.textColor }]}>{greeting}</Text>
            <TouchableOpacity style={[styles.menuButton, { backgroundColor: theme.backgroundColor }]} onPress={onSettingsPress}>
                <Icon name="settings" size={24} color={theme.textColor} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    menuButton: {
        borderRadius: 12,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
});

export default Header;
