import Entypo from "@expo/vector-icons/Entypo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Octicons from "@expo/vector-icons/Octicons";
import { useRouter } from "expo-router";
import React from "react";
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions, // <--- Changed from Dimensions
} from "react-native";

function Homescreen() {
  const router = useRouter();

  // This hook perfectly calculates the width, even if they resize the browser!
  const { width } = useWindowDimensions();

  // --- RESPONSIVE CAPS ---
  // Math.min means "Use the percentage, but NEVER go higher than the second number"
  const titleSize = Math.min(width * 0.12, 60);
  const mainImageSize = Math.min(width * 0.45, 200);
  const starIconSize = Math.min(width * 0.08, 35);
  const bigIconSize = Math.min(width * 0.1, 45);

  const handleStartGame = (chosenDifficulty: string) => {
    router.push({
      pathname: "/game",
      params: { level: chosenDifficulty },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Title Section */}
        <View style={styles.headerSection}>
          <Text
            style={[
              styles.title,
              {
                color: "#E2F200",
                fontSize: titleSize,
                lineHeight: titleSize + 10,
              },
            ]}
          >
            Salpakan
          </Text>
          <Text
            style={[
              styles.title,
              {
                color: "#E2F200",
                fontSize: titleSize,
                lineHeight: titleSize + 10,
              },
            ]}
          >
            Frontlines
          </Text>
        </View>

        {/* Mascot/Icon Section */}
        <Image
          style={[
            styles.mainIcon,
            { width: mainImageSize, height: mainImageSize },
          ]}
          source={require("../assets/images/swords.png")}
          resizeMode="contain"
        />

        <Text style={styles.subtitle}>Select Difficulty</Text>

        {/* Buttons Container */}
        <View style={styles.buttonList}>
          {/* EASY BUTTON */}
          <TouchableOpacity
            style={[styles.buttonBase, styles.easy]}
            onPress={() => handleStartGame("easy")}
          >
            <View style={styles.buttonContent}>
              <Image
                source={require("../assets/images/security.png")}
                style={styles.innerIcon}
              />
              <View style={styles.textContainer}>
                <Text style={[styles.difficultyText, { color: "#81FF81" }]}>
                  EASY
                </Text>
                <Text style={[styles.subText, { color: "#018701" }]}>
                  for recruits
                </Text>
              </View>
              <Entypo name="star" size={bigIconSize} color="#00A700" />
            </View>
          </TouchableOpacity>

          {/* MEDIUM BUTTON */}
          <TouchableOpacity
            style={[styles.buttonBase, styles.medium]}
            onPress={() => handleStartGame("medium")}
          >
            <View style={styles.buttonContent}>
              <MaterialCommunityIcons
                name="sword-cross"
                size={bigIconSize}
                color="#E27A03"
              />
              <View style={styles.textContainer}>
                <Text style={[styles.difficultyText, { color: "#FFFB79" }]}>
                  MEDIUM
                </Text>
                <Text style={[styles.subText, { color: "#D0A700" }]}>
                  for soldiers
                </Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                <Entypo name="star" size={starIconSize} color="#E27A03" />
                <Entypo name="star" size={starIconSize} color="#E27A03" />
              </View>
            </View>
          </TouchableOpacity>

          {/* HARD BUTTON */}
          <TouchableOpacity
            style={[styles.buttonBase, styles.hard]}
            onPress={() => handleStartGame("hard")}
          >
            <View style={styles.buttonContent}>
              <Octicons name="trophy" size={bigIconSize} color="#C80000" />
              <View style={styles.textContainer}>
                <Text style={[styles.difficultyText, { color: "#FFA4A9" }]}>
                  HARD
                </Text>
                <Text style={[styles.subText, { color: "#FF2600" }]}>
                  for generals
                </Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                <Entypo name="star" size={starIconSize} color="#C80000" />
                <Entypo name="star" size={starIconSize} color="#C80000" />
                <Entypo name="star" size={starIconSize} color="#C80000" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default Homescreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#060D1F",
  },
  scrollContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontWeight: "bold",
  },
  mainIcon: {
    marginVertical: 10,
  },
  subtitle: {
    fontSize: 22,
    color: "white",
    fontFamily: "K2D",
    marginBottom: 20,
  },
  buttonList: {
    width: "100%",
    alignItems: "center",
    gap: 20,
  },
  buttonBase: {
    width: "90%",
    maxWidth: 500,
    height: 110,
    borderWidth: 4,
    borderRadius: 20,
    justifyContent: "center",
  },
  easy: {
    borderColor: "#00D719",
    backgroundColor: "#22352F",
  },
  medium: {
    borderColor: "#E27A03",
    backgroundColor: "#353322",
  },
  hard: {
    borderColor: "#C80000",
    backgroundColor: "#352522",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 10,
  },
  innerIcon: {
    height: 50,
    width: 50,
  },
  textContainer: {
    flex: 1,
    flexDirection: "column",
  },
  difficultyText: {
    fontFamily: "DifficultyFont",
    fontSize: 30,
    fontWeight: "semibold",
    letterSpacing: 3,
  },
  subText: {
    fontSize: 14,
  },
});
