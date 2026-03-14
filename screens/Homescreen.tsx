import Entypo from "@expo/vector-icons/Entypo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ScreenShell from "@/components/ScreenShell";
import { appTheme, difficultyTones } from "@/constants/theme";
import { clamp, useResponsiveTokens } from "@/hooks/useResponsiveTokens";

type Difficulty = "easy" | "medium" | "hard";

type DifficultyOption = {
  key: Difficulty;
  title: string;
  subtitle: string;
  description: string;
  stars: number;
  icon: React.ReactNode;
};

const difficultyOptions: DifficultyOption[] = [
  {
    key: "easy",
    title: "Recruit",
    subtitle: "Controlled opening",
    description: "A steadier duel for learning formations and tempo.",
    stars: 1,
    icon: <MaterialCommunityIcons name="shield-outline" size={24} color={difficultyTones.easy.icon} />,
  },
  {
    key: "medium",
    title: "Vanguard",
    subtitle: "Battle-ready pace",
    description: "Balanced pressure with sharper counters and tighter reads.",
    stars: 2,
    icon: <MaterialCommunityIcons name="chess-rook" size={24} color={difficultyTones.medium.icon} />,
  },
  {
    key: "hard",
    title: "Warlord",
    subtitle: "Frontline command",
    description: "Relentless tension for players who want no breathing room.",
    stars: 3,
    icon: <MaterialCommunityIcons name="sword-cross" size={24} color={difficultyTones.hard.icon} />,
  },
];

function Homescreen() {
  const router = useRouter();
  const { width, maxContentWidth, rs, rsv, rf, isCompactHeight, isUltraCompactHeight } = useResponsiveTokens();

  const contentWidth = Math.min(maxContentWidth, rs(510));
  const titleSize = clamp(width * 0.104, rf(28), rf(isCompactHeight ? 44 : 50));
  const cardGap = rsv(isUltraCompactHeight ? 6 : isCompactHeight ? 8 : 10);
  const showHeroCopy = !isUltraCompactHeight;
  const showSummary = !isCompactHeight;
  const showFooterNote = !isCompactHeight;
  const iconFrameSize = rs(isUltraCompactHeight ? 44 : isCompactHeight ? 48 : 56);

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
            width: rs(150),
            height: rs(150),
            borderRadius: rs(75),
            top: rsv(10),
            right: -rs(30),
          },
        ]}
      />
      <View
        style={[
          styles.backgroundFog,
          {
            width: rs(220),
            height: rs(220),
            borderRadius: rs(110),
            bottom: -rs(70),
            left: -rs(40),
          },
        ]}
      />

      <ScreenShell
        style={styles.root}
        maxWidth={contentWidth}
        horizontalPadding={rs(12)}
        topPadding={rsv(isUltraCompactHeight ? 4 : isCompactHeight ? 6 : 10)}
        bottomPadding={rsv(isUltraCompactHeight ? 4 : isCompactHeight ? 6 : 10)}
      >
        <View style={[styles.contentRoot, { maxWidth: contentWidth }]}>
          <View
            style={[
              styles.heroShell,
              {
                paddingHorizontal: rs(16),
                paddingVertical: rsv(isUltraCompactHeight ? 10 : isCompactHeight ? 12 : 16),
                borderRadius: rs(24),
                marginBottom: rsv(isUltraCompactHeight ? 8 : isCompactHeight ? 10 : 14),
              },
            ]}
          >
            <View style={styles.bannerRow}>
              <Text style={[styles.eyebrow, { fontSize: rf(10) }]}>TACTICAL BOARD WAR</Text>
              <View
                style={[
                  styles.bannerChip,
                  {
                    paddingHorizontal: rs(10),
                    paddingVertical: rsv(4),
                    borderRadius: rs(12),
                  },
                ]}
              >
                <Text style={[styles.bannerChipText, { fontSize: rf(10) }]}>MOBILE READY</Text>
              </View>
            </View>

            <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 0.8 }]}>Salpakan</Text>
            <Text style={[styles.title, styles.titleAccent, { fontSize: titleSize * 0.9, lineHeight: titleSize * 0.8 }]}>
              Frontlines
            </Text>

            {showHeroCopy ? (
              <Text
                style={[
                  styles.heroCopy,
                  {
                    fontSize: rf(isCompactHeight ? 12 : 13),
                    lineHeight: rf(isCompactHeight ? 16 : 18),
                    marginTop: rsv(6),
                    marginBottom: showSummary ? rsv(isCompactHeight ? 10 : 14) : 0,
                  },
                ]}
              >
                Command the opening, read the frontline, and lock your formation before the first clash.
              </Text>
            ) : null}

            {showSummary ? (
              <View style={[styles.summaryRow, { gap: rs(8) }]}>
                <View style={[styles.summaryChip, { borderRadius: rs(14), paddingHorizontal: rs(10), paddingVertical: rsv(6) }]}>
                  <Text style={[styles.summaryLabel, { fontSize: rf(10) }]}>FIELD</Text>
                  <Text style={[styles.summaryValue, { fontSize: rf(12) }]}>9 x 8 command board</Text>
                </View>
                <View style={[styles.summaryChip, { borderRadius: rs(14), paddingHorizontal: rs(10), paddingVertical: rsv(6) }]}>
                  <Text style={[styles.summaryLabel, { fontSize: rf(10) }]}>STYLE</Text>
                  <Text style={[styles.summaryValue, { fontSize: rf(12) }]}>Brass, wood, and fire</Text>
                </View>
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.selectionShell,
              {
                flex: 1,
                borderRadius: rs(24),
                paddingHorizontal: rs(14),
                paddingTop: rsv(isUltraCompactHeight ? 10 : isCompactHeight ? 12 : 14),
                paddingBottom: rsv(isUltraCompactHeight ? 8 : isCompactHeight ? 8 : 10),
              },
            ]}
          >
            <View style={[styles.sectionHeaderRow, { marginBottom: rsv(isCompactHeight ? 8 : 10) }]}>
              <View>
                <Text style={[styles.sectionLabel, { fontSize: rf(10) }]}>OPENING ORDERS</Text>
                <Text style={[styles.sectionTitle, { fontSize: rf(isCompactHeight ? 24 : 28) }]}>Choose your command</Text>
              </View>
              <View style={[styles.sectionBadge, { borderRadius: rs(14), paddingHorizontal: rs(10), paddingVertical: rsv(8) }]}>
                <MaterialCommunityIcons name="chess-king" size={rf(18)} color={appTheme.colors.brassBright} />
              </View>
            </View>

            <View style={[styles.cardStack, { gap: cardGap }]}>
              {difficultyOptions.map((option) => {
                const tone = difficultyTones[option.key];

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.difficultyCard,
                      {
                        flex: 1,
                        borderRadius: rs(18),
                        padding: rs(isUltraCompactHeight ? 8 : 10),
                        backgroundColor: tone.shell,
                        borderColor: tone.line,
                      },
                    ]}
                    onPress={() => handleStartGame(option.key)}
                    activeOpacity={0.88}
                  >
                    <View style={[styles.difficultyFace, { borderRadius: rs(16), backgroundColor: tone.face }]}>
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
                        <Text
                          style={[
                            styles.difficultySubtitle,
                            {
                              color: tone.note,
                              fontSize: rf(12),
                              marginBottom: rsv(2),
                            },
                          ]}
                        >
                          {option.subtitle}
                        </Text>
                        {!isUltraCompactHeight ? (
                          <Text
                            style={[
                              styles.difficultyDescription,
                              {
                                color: tone.note,
                                fontSize: rf(11),
                                lineHeight: rf(14),
                              },
                            ]}
                          >
                            {option.description}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.cardAside}>
                        <View style={styles.starRow}>
                          {Array.from({ length: option.stars }, (_, starIndex) => (
                            <Entypo key={`${option.key}-${starIndex}`} name="star" size={rf(14)} color={tone.label} />
                          ))}
                        </View>
                        <Text style={[styles.tapToEnter, { color: tone.label, fontSize: rf(10), marginTop: rsv(4) }]}>
                          DEPLOY
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {showFooterNote ? (
              <Text style={[styles.footerNote, { fontSize: rf(10), marginTop: rsv(8) }]}>
                Lock a difficulty and take your place on the frontline.
              </Text>
            ) : null}
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
    backgroundColor: "rgba(180, 67, 52, 0.18)",
  },
  backgroundFog: {
    position: "absolute",
    backgroundColor: "rgba(199, 163, 84, 0.08)",
  },
  root: {
    flex: 1,
    alignItems: "center",
  },
  contentRoot: {
    width: "100%",
    flex: 1,
    minHeight: 0,
  },
  heroShell: {
    backgroundColor: appTheme.colors.field,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.lineStrong,
    ...appTheme.shadow.hard,
  },
  bannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1.1,
  },
  bannerChip: {
    backgroundColor: appTheme.colors.alert,
    borderWidth: appTheme.borderWidth.thin,
    borderColor: appTheme.colors.brassBright,
  },
  bannerChipText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.8,
  },
  title: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  titleAccent: {
    color: appTheme.colors.brassBright,
  },
  heroCopy: {
    maxWidth: "92%",
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
  },
  summaryRow: {
    flexDirection: "row",
  },
  summaryChip: {
    flex: 1,
    backgroundColor: appTheme.colors.fieldInset,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.line,
  },
  summaryLabel: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.9,
  },
  summaryValue: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
  },
  selectionShell: {
    backgroundColor: appTheme.colors.fieldRaised,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.line,
    ...appTheme.shadow.soft,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    color: appTheme.colors.inkSoft,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1,
  },
  sectionTitle: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    letterSpacing: 0.15,
    textTransform: "uppercase",
  },
  sectionBadge: {
    backgroundColor: appTheme.colors.fieldInset,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.lineStrong,
  },
  cardStack: {
    flex: 1,
    minHeight: 0,
  },
  difficultyCard: {
    width: "100%",
    borderWidth: appTheme.borderWidth.regular,
  },
  difficultyFace: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
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
  },
  difficultyDescription: {
    fontFamily: appTheme.fonts.body,
  },
  cardAside: {
    minWidth: 54,
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
  footerNote: {
    color: appTheme.colors.inkMuted,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
});
