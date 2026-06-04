// ============================================
// UNLOCK CONTACT MODAL
// ============================================
// Reusable bottom-modal that takes a property + onUnlocked callback.
// Lets the user choose MTN / Airtel, enters their phone, taps Pay, then polls.
import React, { useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { lightColors as COLORS } from "../theme/colors";
import { initContactUnlock, pollUntilDone, getPropertyContact } from "../api/payments";

export default function UnlockContactModal({ visible, onClose, property, onUnlocked }) {
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState("mtn");
  const [stage, setStage] = useState("input"); // input | paying | waiting | done | fail
  const [error, setError] = useState("");
  const [price, setPrice] = useState(500);

  React.useEffect(() => {
    if (!visible) return;
    setStage("input"); setError(""); setPhone("");
    // Prefetch current price (also tells us if already unlocked)
    getPropertyContact(property.id).then((r) => {
      if (!r.locked && r.phone) {
        onUnlocked && onUnlocked(r);
        onClose && onClose();
      } else if (r.unlock_price_rwf) {
        setPrice(r.unlock_price_rwf);
      }
    }).catch(() => {});
  }, [visible, property?.id]);

  async function startPay() {
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      setError("Enter your mobile money number (e.g. 0788123456)"); return;
    }
    setError(""); setStage("paying");
    try {
      const res = await initContactUnlock({
        propertyId: property.id, phone, provider,
      });
      if (res.already_unlocked) {
        const c = await getPropertyContact(property.id);
        onUnlocked && onUnlocked(c);
        setStage("done"); return;
      }
      setStage("waiting");
      const final = await pollUntilDone(res.payment.id);
      if (final.status === "success") {
        const c = await getPropertyContact(property.id);
        onUnlocked && onUnlocked(c);
        setStage("done");
      } else if (final.status === "timeout") {
        setError("Payment is still pending. Check your phone for the prompt and try again.");
        setStage("fail");
      } else {
        setError("Payment failed or was cancelled. Please try again.");
        setStage("fail");
      }
    } catch (e) {
      setError(e?.response?.data?.error || "Could not start payment. Try again.");
      setStage("fail");
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Unlock owner's contact</Text>
          <Text style={styles.sub}>
            Pay <Text style={{ fontWeight: "700" }}>{price.toLocaleString()} RWF</Text> to view the phone number of the person listing this property.
          </Text>

          {stage === "input" && (
            <>
              <Text style={styles.label}>Pay with</Text>
              <View style={styles.providerRow}>
                <TouchableOpacity
                  style={[styles.provider, provider === "mtn" && styles.providerActive]}
                  onPress={() => setProvider("mtn")}
                >
                  <Text style={[styles.providerText, provider === "mtn" && styles.providerTextActive]}>
                    MTN MoMo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.provider, provider === "airtel" && styles.providerActive]}
                  onPress={() => setProvider("airtel")}
                >
                  <Text style={[styles.providerText, provider === "airtel" && styles.providerTextActive]}>
                    Airtel Money
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Your mobile money number</Text>
              <TextInput
                style={styles.input}
                value={phone} onChangeText={setPhone}
                placeholder="0788 123 456" keyboardType="phone-pad"
                placeholderTextColor={COLORS.textMuted}
              />

              {error ? <Text style={styles.err}>{error}</Text> : null}

              <TouchableOpacity style={styles.payBtn} onPress={startPay}>
                <Text style={styles.payBtnText}>Pay {price.toLocaleString()} RWF</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {(stage === "paying" || stage === "waiting") && (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: 16, textAlign: "center", color: COLORS.text }}>
                {stage === "paying"
                  ? "Sending payment request..."
                  : "Check your phone and enter your mobile money PIN to approve."}
              </Text>
            </View>
          )}

          {stage === "done" && (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.primary }}>
                Contact unlocked
              </Text>
              <Text style={{ marginTop: 8, textAlign: "center", color: COLORS.text }}>
                You can now see the phone number on the property page.
              </Text>
              <TouchableOpacity style={styles.payBtn} onPress={onClose}>
                <Text style={styles.payBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {stage === "fail" && (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <Text style={[styles.err, { textAlign: "center" }]}>{error}</Text>
              <TouchableOpacity style={styles.payBtn} onPress={() => setStage("input")}>
                <Text style={styles.payBtnText}>Try again</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
           padding: 20, paddingBottom: 32 },
  handle: { width: 40, height: 4, backgroundColor: "#ddd", borderRadius: 2,
            alignSelf: "center", marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  sub: { fontSize: 14, color: COLORS.textMuted, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginTop: 12, marginBottom: 8 },
  providerRow: { flexDirection: "row", gap: 8 },
  provider: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1.5,
              borderColor: "#e5e5e5", alignItems: "center" },
  providerActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "11" },
  providerText: { fontSize: 14, fontWeight: "600", color: COLORS.textMuted },
  providerTextActive: { color: COLORS.primary },
  input: { borderWidth: 1.5, borderColor: "#e5e5e5", borderRadius: 10,
           padding: 14, fontSize: 16, color: COLORS.text },
  payBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12,
            alignItems: "center", marginTop: 18 },
  payBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { padding: 12, alignItems: "center", marginTop: 4 },
  cancelText: { color: COLORS.textMuted, fontSize: 14 },
  err: { color: "#dc2626", fontSize: 13, marginTop: 8 },
});
