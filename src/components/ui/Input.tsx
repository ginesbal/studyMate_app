import React from 'react';
import {StyleSheet, TextInput, TextInputProps} from 'react-native';

// Extend TextInputProps to include all props that TextInput supports
type InputProps = TextInputProps & {
  placeholder: string;
  value: string;
  onChangeText?: (text: string) => void; // Make onChangeText optional
  multiline?: boolean;
  editable?: boolean;
};

const Input: React.FC<InputProps> = ({
  placeholder,
  value,
  onChangeText,
  multiline = false,
  editable = true,
  ...rest // Spread any additional props to pass to TextInput
}) => {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      editable={editable}
      placeholderTextColor="#B7B7A4"
      {...rest} // Include additional props
    />
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#B7B7A4',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    color: '#283618',
  },
});

export default Input;
