import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

interface FormInputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
}

export function FormInput({
  label,
  hint,
  error,
  containerStyle,
  isPassword = false,
  ...props
}: FormInputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label.toUpperCase()}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.text3}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.text3}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.micro,
    color: colors.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  inputFocused: {
    borderColor: colors.green,
  },
  inputError: {
    borderColor: colors.red,
  },
  input: {
    flex: 1,
    padding: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter',
    color: colors.text,
  },
  eyeBtn: {
    padding: 12,
    paddingRight: 14,
  },
  hint: {
    ...typography.small,
    color: colors.text3,
    marginTop: 5,
  },
  error: {
    ...typography.small,
    color: colors.red,
    marginTop: 5,
  },
});
