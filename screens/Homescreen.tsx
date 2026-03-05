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
} from "react-native";

import { clamp, useResponsiveTokens } from "@/hooks/useResponsiveTokens";

function Homescreen() {
  const router = useRouter();
  const tokens = useResponsiveTokens(670);
  const { width, maxContentWidth, rs, rsv, rf, shouldUseScrollFallback } = tokens;

  type Difficulty = "easy" | "medium" | "hard";

  const titleSize = clamp(width * 0.12, rf(34), rf(58));
  const mainImageSize = clamp(width * 0.42, rs(130), rs(210));
  const starIconSize = clamp(width * 0.08, rs(20), rs(34));
  const bigIconSize = clamp(width * 0.1, rs(24), rs(42));

  const handleStartGame = (chosenDifficulty: Difficulty) => {
    router.push({
      pathname: "/game",
      params: { level: chosenDifficulty },
    });
  };

  const content = (
    <View style={[styles.contentRoot, { maxWidth: maxContentWidth }]}> 
      <View style={[styles.headerSection, { marginBottom: rsv(8) }]}> 
        <Text
          style={[
            styles.title,
            {
              color: "#E2F200",
              fontSize: titleSize,
              lineHeight: titleSize + rf(8),
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
              lineHeight: titleSize + rf(8),
            },
          ]}
        >
          Frontlines
        </Text>
      </View>

      <Image
        style={[
          styles.mainIcon,
          {
            width: mainImageSize,
            height: mainImageSize,
            marginVertical: rsv(6),
          },
        ]}
        source={require("../assets/images/swords.png")}
        resizeMode="contain"
      />

      <Text
        style={[
          styles.subtitle,
          {
            fontSize: rf(22),
            marginBottom: rsv(14),
          },
        ]}
      >
        Select Difficulty
      </Text>

      <View style={[styles.buttonList, { gap: rsv(12) }]}> 
        <TouchableOpacity
          style={[
            styles.buttonBase,
            styles.easy,
            {
              maxWidth: maxContentWidth,
              height: rsv(94),
              borderRadius: rs(18),
              borderWidth: Math.max(2, rs(4)),
            },
          ]}
          onPress={() => handleStartGame("easy")}
        >
          <View style={[styles.buttonContent, { paddingHorizontal: rs(14), gap: rs(8) }]}> 
            <Image
              source={require("../assets/images/security.png")}
              style={{ height: rs(42), width: rs(42) }}
            />
            <View style={styles.textContainer}>
              <Text style={[styles.difficultyText, { color: "#81FF81", fontSize: rf(28), letterSpacing: rs(2) }]}> 
                EASY
              </Text>
              <Text style={[styles.subText, { color: "#018701", fontSize: rf(13) }]}> 
                for recruits
              </Text>
            </View>
            <Entypo name="star" size={bigIconSize} color="#00A700" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.buttonBase,
            styles.medium,
            {
              maxWidth: maxContentWidth,
              height: rsv(94),
              borderRadius: rs(18),
              borderWidth: Math.max(2, rs(4)),
            },
          ]}
          onPress={() => handleStartGame("medium")}
        >
          <View style={[styles.buttonContent, { paddingHorizontal: rs(14), gap: rs(8) }]}> 
            <MaterialCommunityIcons
              name="sword-cross"
              size={bigIconSize}
              color="#E27A03"
            />
            <View style={styles.textContainer}>
              <Text style={[styles.difficultyText, { color: "#FFFB79", fontSize: rf(28), letterSpacing: rs(2) }]}> 
                MEDIUM
              </Text>
              <Text style={[styles.subText, { color: "#D0A700", fontSize: rf(13) }]}> 
                for soldiers
              </Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Entypo name="star" size={starIconSize} color="#E27A03" />
              <Entypo name="star" size={starIconSize} color="#E27A03" />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.buttonBase,
            styles.hard,
            {
              maxWidth: maxContentWidth,
              height: rsv(94),
              borderRadius: rs(18),
              borderWidth: Math.max(2, rs(4)),
            },
          ]}
          onPress={() => handleStartGame("hard")}
        >
          <View style={[styles.buttonContent, { paddingHorizontal: rs(14), gap: rs(8) }]}> 
            <Octicons name="trophy" size={bigIconSize} color="#C80000" />
            <View style={styles.textContainer}>
              <Text style={[styles.difficultyText, { color: "#FFA4A9", fontSize: rf(28), letterSpacing: rs(2) }]}> 
                HARD
              </Text>
              <Text style={[styles.subText, { color: "#FF2600", fontSize: rf(13) }]}> 
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
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {shouldUseScrollFallback ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingVertical: rsv(16), paddingHorizontal: rs(12) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.noScrollContainer,
            { paddingVertical: rsv(12), paddingHorizontal: rs(12) },
          ]}
        >
          {content}
        </View>
      )}
    </SafeAreaView>
  );
}

export default Homescreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#060D1F",
  },
  noScrollContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContainer: {
    alignItems: "center",
  },
  contentRoot: {
    width: "100%",
    alignItems: "center",
  },
  headerSection: {
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
  },
  mainIcon: {},
  subtitle: {
    color: "white",
    fontFamily: "K2D",
  },
  buttonList: {
    width: "100%",
    alignItems: "center",
  },
  buttonBase: {
    width: "92%",
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
  },
  textContainer: {
    flex: 1,
    flexDirection: "column",
  },
  difficultyText: {
    fontFamily: "DifficultyFont",
    fontWeight: "600",
  },
  subText: {},
});

