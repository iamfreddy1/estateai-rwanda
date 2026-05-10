// ============================================
// REUSABLE FORM FIELD
// ============================================
// Consistent labels, inputs, and high-contrast styling.

import { View, Text, TextInput, StyleSheet, useColorScheme } from "react-native";
import { getColors, spacing, radius } from "../theme/colors";

export default function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  secureTextEntry = false,
  autoCapitalize = "sentences",
  multiline = false,
}) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        value={String(value ?? "")}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.multiline,
          {
            backgroundColor: colors.background,
            color: colors.text,
            borderColor: colors.borderStrong,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    fontSize: 15, fontWeight: "500",
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
});
