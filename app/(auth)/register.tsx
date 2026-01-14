import { useAuthStore } from "@/stores/useAuthStore";
import { Link } from "expo-router";
import React, { FC, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Register: FC = () => {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const register = useAuthStore((state) => state.register);

  const handleSignup = async () => {
    if (!email || !password || !username) {
      Alert.alert("Missing fields", "Please enter both email and password.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }
    try {
      setIsLoading(true);
      await register(email, password, username);
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
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            {/* <Image source={require("../../assets/images/tiktok_logo.png")} style={styles.logo} resizeMode="contain" /> */}
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Join the community and start watching short videos.</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor="#999"
              style={styles.input}
              autoCapitalize="none"
              returnKeyType="next"
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              returnKeyType="next"
            />
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                style={[styles.input, styles.passwordInput]}
                returnKeyType="next"
              />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                style={[styles.input, styles.passwordInput]}
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSignup} activeOpacity={0.85}>
              <Text style={styles.buttonText}>{isLoading ? "Loading..." : "Sign up"}</Text>
            </TouchableOpacity>

            {/* <Text style={styles.orText}>or sign up with</Text> */}

            {/* <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8} onPress={() => Alert.alert("Google sign-in")}>
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8} onPress={() => Alert.alert("Apple sign-in")}>
              <Text style={styles.socialText}>Apple</Text>
            </TouchableOpacity>
          </View> */}

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Link href="/login">
                <Text style={styles.footerLink}> Log in</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  flex: { flex: 1, backgroundColor: "#000" },
  container: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  header: { alignItems: "center", marginBottom: 24 },
  logo: { width: 80, height: 80, marginBottom: 12 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#9e9e9e", fontSize: 13, textAlign: "center", maxWidth: 300 },
  form: { width: "100%", marginTop: 8 },
  input: {
    backgroundColor: "#111",
    color: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  passwordRow: {},
  passwordInput: {},
  button: {
    backgroundColor: "#FE2C55",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  orText: { color: "#9e9e9e", textAlign: "center", marginVertical: 14 },
  socialRow: { flexDirection: "row", justifyContent: "space-between" },
  socialBtn: {
    backgroundColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  socialText: { color: "#fff", fontWeight: "600" },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  footerText: { color: "#9e9e9e" },
  footerLink: { color: "#fff", fontWeight: "700" },
});

export default Register;
