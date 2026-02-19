import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function GameScreen() {
  const router = useRouter();

  const { level } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{level}</Text>

      {/* A button to quit back to the menu */}
      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060D1F",
    justifyContent: "center",
    alignItems: "center",
  },

  subtitle: {
    fontSize: 24,
    color: "white",
    marginTop: 20,
    marginBottom: 50,
  },
  button: {
    padding: 15,
    backgroundColor: "#C80000",
    borderRadius: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
});
