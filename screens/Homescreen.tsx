import Entypo from "@expo/vector-icons/Entypo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Octicons from "@expo/vector-icons/Octicons";
import { useRouter } from "expo-router";
import React from "react";
import {
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width } = Dimensions.get("window");

function Homescreen() {
  const router = useRouter();
  const handleStartGame = (chosenDifficulty: string) => {
    // This sends the user to app/game.tsx AND passes the difficulty
    router.push({
      pathname: "/game",
      params: { level: chosenDifficulty }, // 'level' is the name of the variable we are sending
    });
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Title Section */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: "#E2F200" }]}>Salpakan</Text>
          <Text style={[styles.title, { color: "#E2F200" }]}>Frontlines</Text>
        </View>

        {/* Mascot/Icon Section */}
        <Image
          style={styles.mainIcon}
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
              <Entypo name="star" size={width * 0.1} color="#00A700" />
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
                size={width * 0.1}
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
                <Entypo name="star" size={width * 0.08} color="#E27A03" />
                <Entypo name="star" size={width * 0.08} color="#E27A03" />
              </View>
            </View>
          </TouchableOpacity>

          {/* HARD BUTTON */}
          <TouchableOpacity
            style={[styles.buttonBase, styles.hard]}
            onPress={() => handleStartGame("hard")}
          >
            <View style={styles.buttonContent}>
              <Octicons name="trophy" size={width * 0.1} color="#C80000" />
              <View style={styles.textContainer}>
                <Text style={[styles.difficultyText, { color: "#FFA4A9" }]}>
                  HARD
                </Text>
                <Text style={[styles.subText, { color: "#FF2600" }]}>
                  for generals
                </Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                <Entypo name="star" size={width * 0.07} color="#C80000" />
                <Entypo name="star" size={width * 0.07} color="#C80000" />
                <Entypo name="star" size={width * 0.07} color="#C80000" />
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
    fontSize: width * 0.12,
    fontWeight: "bold",
    lineHeight: width * 0.14,
  },
  mainIcon: {
    height: width * 0.45,
    width: width * 0.45,
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
    fontSize: 22,
    fontWeight: "bold",
  },
  subText: {
    fontSize: 14,
  },
});
