import Entypo from "@expo/vector-icons/Entypo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ScreenShell from "@/components/ScreenShell";
import { appTheme, difficultyTones } from "@/constants/theme";
import { useResponsiveTokens } from "@/hooks/useResponsiveTokens";

type Difficulty = "easy" | "medium" | "hard";

type DifficultyOption = {
  key: Difficulty;
  title: string;
  subtitle: string;
  command: string;
  stars: number;
  icon: React.ReactNode;
};

const difficultyOptions: DifficultyOption[] = [
  {
    key: "easy",
    title: "Recruit",
    subtitle: "Measured opening",
    command: "Best for learning the board and reserve flow.",
    stars: 1,
    icon: <MaterialCommunityIcons name="shield-outline" size={24} color={difficultyTones.easy.icon} />,
  },
  {
    key: "medium",
    title: "Vanguard",
    subtitle: "Balanced pressure",
    command: "A steadier duel with sharper counters.",
    stars: 2,
    icon: <MaterialCommunityIcons name="chess-rook" size={24} color={difficultyTones.medium.icon} />,
  },
  {
    key: "hard",
    title: "Warlord",
    subtitle: "No easy ground",
    command: "For players who want immediate tension.",
    stars: 3,
    icon: <MaterialCommunityIcons name="sword-cross" size={24} color={difficultyTones.hard.icon} />,
  },
];

function Homescreen() {
  const router = useRouter();
  const {
    safeHeight,
    layoutWidth,
    rs,
    rsv,
    rf,
    contentPaddingX,
    sectionGap,
    cardGap,
    cardPadding,
    panelRadius,
    isCompactHeight,
    isUltraCompactHeight,
  } = useResponsiveTokens();

  const contentWidth = Math.min(layoutWidth, rs(530));
  const iconFrameSize = rs(isUltraCompactHeight ? 44 : isCompactHeight ? 50 : 58);
  const scrollable = safeHeight < 760;

  const handleStartGame = (chosenDifficulty: Difficulty) => {
    router.push({
      pathname: "/game",
      params: { level: chosenDifficulty },
    });
  };

  return (
    <View style={styles.safeArea}>
      <View
        style={[
          styles.backgroundEmber,
          {
            width: rs(170),
            height: rs(170),
            borderRadius: rs(85),
            top: rsv(6),
            right: -rs(26),
          },
        ]}
      />
      <View
        style={[
          styles.backgroundFog,
          {
            width: rs(250),
            height: rs(250),
            borderRadius: rs(125),
            bottom: -rs(84),
            left: -rs(54),
          },
        ]}
      />

      <ScreenShell
        style={styles.root}
        maxWidth={contentWidth}
        horizontalPadding={contentPaddingX}
        topPadding={rsv(isUltraCompactHeight ? 10 : 18)}
        bottomPadding={rsv(isUltraCompactHeight ? 12 : 20)}
        scrollable={scrollable}
      >
        <View style={[styles.contentRoot, !scrollable && styles.contentRootCentered, { maxWidth: contentWidth }]}>
          <View
            style={[
              styles.heroPanel,
              {
                borderRadius: panelRadius,
                paddingHorizontal: cardPadding,
                paddingTop: rsv(isUltraCompactHeight ? 16 : 22),
                paddingBottom: rsv(isUltraCompactHeight ? 14 : 18),
              },
            ]}
          >
            <Text style={[styles.heroLabel, { fontSize: rf(10) }]}>COMMAND SELECTION</Text>
            <Text style={[styles.heroTitle, { fontSize: rf(isCompactHeight ? 26 : 30), marginTop: rsv(4) }]}>Choose your command</Text>
            <Text style={[styles.heroCopy, { fontSize: rf(12), lineHeight: rf(17), marginTop: rsv(8) }]}>
              Pick your opening pressure, then deploy to the frontline.
            </Text>
          </View>

          <View
            style={[
              styles.selectionShell,
              {
                borderRadius: panelRadius,
                paddingHorizontal: cardPadding,
                paddingTop: rsv(isUltraCompactHeight ? 14 : 18),
                paddingBottom: rsv(isUltraCompactHeight ? 14 : 18),
                marginTop: sectionGap,
              },
            ]}
          >
            <View style={[styles.cardStack, { gap: cardGap }]}>
              {difficultyOptions.map((option) => {
                const tone = difficultyTones[option.key];

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.difficultyCard,
                      {
                        borderRadius: rs(20),
                        padding: rs(isUltraCompactHeight ? 8 : 10),
                        backgroundColor: tone.shell,
                        borderColor: tone.line,
                      },
                    ]}
                    onPress={() => handleStartGame(option.key)}
                    activeOpacity={0.88}
                  >
                    <View style={[styles.difficultyFace, { borderRadius: rs(18), backgroundColor: tone.face }]}>
                      <View style={[styles.cardRail, { width: rs(8), borderRadius: rs(8), backgroundColor: tone.accent }]} />

                      <View
                        style={[
                          styles.iconFrame,
                          {
                            width: iconFrameSize,
                            height: iconFrameSize,
                            borderRadius: rs(16),
                            backgroundColor: tone.accent,
                          },
                        ]}
                      >
                        {option.icon}
                      </View>

                      <View style={styles.cardTextBlock}>
                        <Text style={[styles.difficultyTitle, { color: tone.label, fontSize: rf(isCompactHeight ? 21 : 24) }]}>
                          {option.title}
                        </Text>
                        <Text style={[styles.difficultySubtitle, { color: tone.note, fontSize: rf(12), marginTop: rsv(1) }]}>
                          {option.subtitle}
                        </Text>
                        {!isUltraCompactHeight ? (
                          <Text
                            style={[
                              styles.difficultyDescription,
                              {
                                color: tone.note,
                                fontSize: rf(11),
                                lineHeight: rf(15),
                                marginTop: rsv(3),
                              },
                            ]}
                          >
                            {option.command}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.cardAside}>
                        <View style={styles.starRow}>
                          {Array.from({ length: option.stars }, (_, starIndex) => (
                            <Entypo key={`${option.key}-${starIndex}`} name="star" size={rf(14)} color={tone.label} />
                          ))}
                        </View>
                        <Text style={[styles.tapToEnter, { color: tone.label, fontSize: rf(10), marginTop: rsv(6) }]}>DEPLOY</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  borderRadius: rs(16),
                  paddingVertical: rsv(isUltraCompactHeight ? 10 : 12),
                  marginTop: sectionGap,
                },
              ]}
              onPress={() => router.replace("/")}
              activeOpacity={0.85}
            >
              <Text style={[styles.backButtonText, { fontSize: rf(13) }]}>Back to Main Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenShell>
    </View>
  );
}

export default Homescreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appTheme.colors.background,
  },
  backgroundEmber: {
    position: "absolute",
    backgroundColor: "rgba(180, 67, 52, 0.2)",
  },
  backgroundFog: {
    position: "absolute",
    backgroundColor: "rgba(199, 163, 84, 0.1)",
  },
  root: {
    flex: 1,
    alignItems: "center",
  },
  contentRoot: {
    width: "100%",
  },
  contentRootCentered: {
    flex: 1,
    justifyContent: "center",
  },
  heroPanel: {
    backgroundColor: appTheme.surfaces.hero.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.hero.borderColor,
    ...appTheme.shadow.hard,
  },
  heroLabel: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textTransform: "uppercase",
    letterSpacing: 0.15,
  },
  heroCopy: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
  },
  selectionShell: {
    backgroundColor: appTheme.surfaces.section.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.section.borderColor,
    ...appTheme.shadow.soft,
  },
  cardStack: {
    paddingTop: 2,
  },
  backButton: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.commandSecondary.borderColor,
  },
  backButtonText: {
    color: appTheme.surfaces.commandSecondary.textColor,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  difficultyCard: {
    width: "100%",
    borderWidth: appTheme.borderWidth.regular,
    ...appTheme.shadow.soft,
  },
  difficultyFace: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 102,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  cardRail: {
    alignSelf: "stretch",
    marginRight: 8,
  },
  iconFrame: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardTextBlock: {
    flex: 1,
    justifyContent: "center",
  },
  difficultyTitle: {
    fontFamily: appTheme.fonts.display,
    letterSpacing: 0.15,
    textTransform: "uppercase",
  },
  difficultySubtitle: {
    fontFamily: appTheme.fonts.body,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  difficultyDescription: {
    fontFamily: appTheme.fonts.body,
  },
  cardAside: {
    minWidth: 56,
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 8,
  },
  starRow: {
    flexDirection: "row",
    gap: 2,
  },
  tapToEnter: {
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.8,
  },
});
