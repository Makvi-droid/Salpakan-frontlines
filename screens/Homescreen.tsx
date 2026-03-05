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

import { appTheme, difficultyTones } from "@/constants/theme";
import { clamp, useResponsiveTokens } from "@/hooks/useResponsiveTokens";

type Difficulty = "easy" | "medium" | "hard";

type DifficultyOption = {
  key: Difficulty;
  title: string;
  subtitle: string;
  stars: number;
  borderStyle?: "solid" | "dashed";
  icon: React.ReactNode;
};

const difficultyOptions: DifficultyOption[] = [
  {
    key: "easy",
    title: "EASY",
    subtitle: "for recruits",
    stars: 1,
    icon: <Image source={require("../assets/images/security.png")} style={{ height: 38, width: 38 }} />,
  },
  {
    key: "medium",
    title: "MEDIUM",
    subtitle: "for soldiers",
    stars: 2,
    borderStyle: "dashed",
    icon: <MaterialCommunityIcons name="sword-cross" size={34} color={difficultyTones.medium.icon} />,
  },
  {
    key: "hard",
    title: "HARD",
    subtitle: "for generals",
    stars: 3,
    icon: <Octicons name="trophy" size={34} color={difficultyTones.hard.icon} />,
  },
];

function Homescreen() {
  const router = useRouter();
  const tokens = useResponsiveTokens(670);
  const { width, maxContentWidth, rs, rsv, rf, shouldUseScrollFallback } = tokens;

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
      <View style={[styles.headerSection, { marginBottom: rsv(10) }]}>
        <Text
          style={[
            styles.title,
            {
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
            marginVertical: rsv(8),
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
        {difficultyOptions.map((option, index) => {
          const tone = difficultyTones[option.key];

          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.buttonBase,
                {
                  maxWidth: maxContentWidth,
                  height: rsv(96),
                  borderRadius: rs(18),
                  borderWidth: index === 0 ? Math.max(2, rs(4)) : Math.max(2, rs(3)),
                  borderColor: tone.border,
                  backgroundColor: tone.bg,
                  borderStyle: option.borderStyle ?? "solid",
                },
              ]}
              onPress={() => handleStartGame(option.key)}
              activeOpacity={0.86}
            >
              <View style={[styles.buttonContent, { paddingHorizontal: rs(14), gap: rs(8) }]}>
                <View style={[styles.leftIconWrap, { width: bigIconSize }]}>
                  {option.key === "easy" ? (
                    <Image
                      source={require("../assets/images/security.png")}
                      style={{ height: rs(38), width: rs(38), tintColor: tone.icon }}
                    />
                  ) : (
                    option.icon
                  )}
                </View>

                <View style={styles.textContainer}>
                  <Text style={[styles.difficultyText, { color: tone.label, fontSize: rf(28), letterSpacing: rs(1.5) }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.subText, { color: tone.subLabel, fontSize: rf(13) }]}>{option.subtitle}</Text>
                </View>

                <View style={styles.starRow}>
                  {Array.from({ length: option.stars }, (_, starIndex) => (
                    <Entypo key={`${option.key}-${starIndex}`} name="star" size={starIconSize} color={tone.icon} />
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
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
    backgroundColor: appTheme.colors.mono.appBackground,
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
    color: appTheme.colors.mono.textPrimary,
    fontFamily: appTheme.fonts.display,
    letterSpacing: 1,
  },
  mainIcon: {
    tintColor: appTheme.colors.mono.textPrimary,
  },
  subtitle: {
    color: appTheme.colors.mono.textSecondary,
    fontFamily: appTheme.fonts.body,
  },
  buttonList: {
    width: "100%",
    alignItems: "center",
  },
  buttonBase: {
    width: "92%",
    justifyContent: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  leftIconWrap: {
    alignItems: "flex-start",
  },
  textContainer: {
    flex: 1,
    flexDirection: "column",
  },
  difficultyText: {
    fontFamily: appTheme.fonts.display,
  },
  subText: {
    fontFamily: appTheme.fonts.body,
  },
  starRow: {
    flexDirection: "row",
  },
});

