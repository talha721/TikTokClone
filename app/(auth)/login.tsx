import { useAuthStore } from "@/stores/useAuthStore";
import { Link } from "expo-router";
import React, { FC, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Login: FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter both email and password.");
      return;
    }

    try {
      setIsLoading(true);
      await login(email, password);
      // setIsLoading(false);
    } catch (error) {
      console.log("🚀 ~ handleLogin ~ error:", error);
      Alert.alert("Login failed", "Please check your credentials and try again.");
      // setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.logo}>TikTok</Text>
            <Text style={styles.subtitle}>Welcome back — sign in to continue</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Phone, email or username</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email or username"
              placeholderTextColor="#9AA0A6"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="identifier"
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#9AA0A6"
              style={styles.input}
              secureTextEntry
              accessibilityLabel="password"
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>{isLoading ? "Loading..." : "Log in"}</Text>
            </TouchableOpacity>

            {/* <View style={styles.rowCenter}>
              <View style={styles.divider} />
              <Text style={styles.orText}>Or</Text>
              <View style={styles.divider} />
            </View> */}

            {/* <TouchableOpacity style={styles.altButton} onPress={() => {}} accessibilityRole="button">
              <Text style={styles.altButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {Platform.OS === "ios" && (
              <TouchableOpacity style={[styles.altButton, { marginTop: 8 }]} onPress={() => {}} accessibilityRole="button">
                <Text style={styles.altButtonText}>Continue with Apple</Text>
              </TouchableOpacity>
            )} */}

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don&apos;t have an account?</Text>
              <Link href="/register">
                <Text style={styles.link}> Sign up</Text>
              </Link>
            </View>

            {/* <TouchableOpacity onPress={() => {}}>
              <Text style={[styles.link, { alignSelf: "center", marginTop: 8 }]}>Forgot password?</Text>
            </TouchableOpacity> */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  container: { flex: 1 },
  content: { padding: 24, flexGrow: 1, justifyContent: "center" },
  brand: { alignItems: "center", marginBottom: 24 },
  logo: { fontSize: 36, fontWeight: "700", color: "white" },
  subtitle: { color: "#AAB2B8", marginTop: 6 },
  form: { marginTop: 12 },
  label: { color: "#D0D6DB", marginBottom: 6 },
  input: {
    backgroundColor: "#1A1A1A",
    color: "white",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
  },
  primaryButton: {
    backgroundColor: "#FE2C55",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButtonText: { color: "white", fontWeight: "600" },
  rowCenter: { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  divider: { flex: 1, height: 1, backgroundColor: "#222" },
  orText: { marginHorizontal: 12, color: "#9AA0A6" },
  altButton: {
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  altButtonText: { color: "white" },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  footerText: { color: "#9AA0A6" },
  link: { color: "#FFFFFF", fontWeight: "600" },
});

export default Login;
