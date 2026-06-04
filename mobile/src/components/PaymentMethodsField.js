// ============================================
// PAYMENT METHODS FIELD  (used in SellScreen + EditListingScreen)
// ============================================
// Props:
//   value: { methods: string[], mtn_number, airtel_number, bk_account_number,
//            equity_account_number, account_holder_name, show_payment_details }
//   onChange: (next) => void
//   colors:   theme palette
import React from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet } from "react-native";

const METHODS = [
  { code: "mtn",    label: "MTN Mobile Money",  color: "#fbbf24" },
  { code: "airtel", label: "Airtel Money",       color: "#ef4444" },
  { code: "bk",     label: "Bank of Kigali",     color: "#2563eb" },
  { code: "equity", label: "Equity Bank Rwanda", color: "#a21caf" },
];

export default function PaymentMethodsField({ value, onChange, colors }) {
  const v = value || {};
  const methods = Array.isArray(v.methods) ? v.methods : [];

  const toggle = (code) => {
    const next = methods.includes(code)
      ? methods.filter((m) => m !== code)
      : [...methods, code];
    onChange({ ...v, methods: next });
  };

  const set = (k, val) => onChange({ ...v, [k]: val });
  const has = (m) => methods.includes(m);

  return (
    <View style={{ marginVertical: 12 }}>
      <Text style={[styles.section, { color: colors.text }]}>💳 How buyers can pay you</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 10 }}>
        Pick all methods you accept. Buyers will see these on your listing.
      </Text>

      {/* Method checkboxes */}
      {METHODS.map((m) => (
        <TouchableOpacity
          key={m.code}
          onPress={() => toggle(m.code)}
          activeOpacity={0.7}
          style={[
            styles.row,
            {
              backgroundColor: has(m.code) ? m.color + "22" : colors.cardAlt,
              borderColor: has(m.code) ? m.color : colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.check,
              {
                borderColor: has(m.code) ? m.color : colors.borderStrong,
                backgroundColor: has(m.code) ? m.color : "transparent",
              },
            ]}
          >
            {has(m.code) && <Text style={{ color: "#fff", fontWeight: "800" }}>✓</Text>}
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>{m.label}</Text>
        </TouchableOpacity>
      ))}

      {/* Conditional inputs */}
      {methods.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Account holder name *</Text>
          <TextInput
            value={v.account_holder_name || ""}
            onChangeText={(t) => set("account_holder_name", t)}
            placeholder="e.g. NZAMURAMBAHO Frederick"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.cardAlt, borderColor: colors.border }]}
          />
        </View>
      )}

      {has("mtn") && (
        <View style={{ marginTop: 10 }}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>MTN MoMo number *</Text>
          <TextInput
            value={v.mtn_number || ""}
            onChangeText={(t) => set("mtn_number", t)}
            placeholder="0788 123 456"
            keyboardType="phone-pad"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.cardAlt, borderColor: colors.border }]}
          />
        </View>
      )}

      {has("airtel") && (
        <View style={{ marginTop: 10 }}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Airtel Money number *</Text>
          <TextInput
            value={v.airtel_number || ""}
            onChangeText={(t) => set("airtel_number", t)}
            placeholder="0732 123 456"
            keyboardType="phone-pad"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.cardAlt, borderColor: colors.border }]}
          />
        </View>
      )}

      {has("bk") && (
        <View style={{ marginTop: 10 }}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Bank of Kigali account number *</Text>
          <TextInput
            value={v.bk_account_number || ""}
            onChangeText={(t) => set("bk_account_number", t.replace(/\D/g, ""))}
            placeholder="1000234567890"
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.cardAlt, borderColor: colors.border }]}
          />
        </View>
      )}

      {has("equity") && (
        <View style={{ marginTop: 10 }}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Equity Bank account number *</Text>
          <TextInput
            value={v.equity_account_number || ""}
            onChangeText={(t) => set("equity_account_number", t.replace(/\D/g, ""))}
            placeholder="4001234567890"
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.cardAlt, borderColor: colors.border }]}
          />
        </View>
      )}

      {/* Privacy toggle */}
      <View style={[styles.toggleRow, { borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>Show payment details publicly</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            Off = buyers must contact you to ask how to pay.
          </Text>
        </View>
        <Switch
          value={v.show_payment_details !== false}
          onValueChange={(b) => set("show_payment_details", b)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", padding: 12,
         borderRadius: 10, borderWidth: 1.5, marginBottom: 8 },
  check: { width: 22, height: 22, borderRadius: 5, borderWidth: 2,
           marginRight: 12, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14, fontWeight: "600" },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14 },
  toggleRow: { flexDirection: "row", alignItems: "center", marginTop: 14,
               paddingTop: 12, borderTopWidth: 1 },
  toggleLabel: { fontSize: 14, fontWeight: "600" },
});
