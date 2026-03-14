import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ScreenShell from "@/components/ScreenShell";
import { appTheme } from "@/constants/theme";
import { useResponsiveTokens } from "@/hooks/useResponsiveTokens";

type GuideCard = {
  title: string;
  body: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const guideCards: GuideCard[] = [
  {
    title: "What is Salpakan?",
    body: "Salpakan: Frontlines is a tactical board duel where your opening formation matters before the first clash even begins.",
    icon: "flag-variant",
  },
  {
    title: "Formation Phase",
    body: "When the match begins, choose a difficulty, open your reserve, and place every rank inside the highlighted frontline setup rows.",
    icon: "view-dashboard-outline",
  },
  {
    title: "Placing Units",
    body: "Tap a rank from the reserve, tap a setup tile to place it, tap an occupied setup tile to move it, and double tap a piece to remove it.",
    icon: "gesture-tap-button",
  },
  {
    title: "Starting the Match",
    body: "Use Random if you want a quick legal arrangement, then press Ready once every unit has been deployed.",
    icon: "sword",
  },
  {
    title: "How to Begin",
    body: "Return to the main menu, press Play, pick Recruit, Vanguard, or Warlord, then finish your setup on the game board.",
    icon: "arrow-right-bold-circle-outline",
  },
];

export default function GuideScreen() {
  const router = useRouter();
  const {
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

  const contentWidth = Math.min(layoutWidth, rs(540));

  return (
    <View style={styles.safeArea}>
      <View
        style={[
          styles.backgroundFog,
          {
            width: rs(190),
            height: rs(190),
            borderRadius: rs(95),
            top: -rsv(8),
            right: -rs(24),
          },
        ]}
      />

      <ScreenShell
        style={styles.root}
        maxWidth={contentWidth}
        horizontalPadding={contentPaddingX}
        topPadding={rsv(isUltraCompactHeight ? 8 : 12)}
        bottomPadding={rsv(isUltraCompactHeight ? 10 : 16)}
        scrollable
      >
        <View style={[styles.contentRoot, { maxWidth: contentWidth }]}>
          <TouchableOpacity
            style={[styles.backButton, { marginBottom: sectionGap, borderRadius: rs(14), paddingHorizontal: rs(12), paddingVertical: rsv(8) }]}
            onPress={() => router.replace("/")}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="arrow-left" size={rf(18)} color={appTheme.colors.brassBright} />
            <Text style={[styles.backButtonText, { fontSize: rf(12) }]}>Back to Menu</Text>
          </TouchableOpacity>

          <View
            style={[
              styles.headerPanel,
              {
                borderRadius: panelRadius,
                paddingHorizontal: cardPadding,
                paddingVertical: rsv(isUltraCompactHeight ? 12 : 16),
                marginBottom: sectionGap,
              },
            ]}
          >
            <Text style={[styles.headerLabel, { fontSize: rf(10) }]}>SOLDIER'S GUIDE</Text>
            <Text style={[styles.headerTitle, { fontSize: rf(isCompactHeight ? 26 : 30), marginTop: rsv(4) }]}>Know the frontline before you deploy</Text>
            <Text style={[styles.headerCopy, { fontSize: rf(12), lineHeight: rf(17), marginTop: rsv(8) }]}>
              This build focuses on pre-battle setup, reserve management, and getting your first formation onto the board cleanly.
            </Text>
          </View>

          <View style={[styles.scrollContent, { paddingBottom: rsv(12), rowGap: cardGap }]}>
            {guideCards.map((card) => (
              <View
                key={card.title}
                style={[
                  styles.guideCard,
                  {
                    borderRadius: rs(20),
                    paddingHorizontal: cardPadding,
                    paddingVertical: rsv(isUltraCompactHeight ? 12 : 14),
                  },
                ]}
              >
                <View style={[styles.guideIconWrap, { width: rs(42), height: rs(42), borderRadius: rs(14) }]}>
                  <MaterialCommunityIcons name={card.icon} size={rf(20)} color={appTheme.colors.brassBright} />
                </View>
                <View style={styles.guideTextBlock}>
                  <Text style={[styles.guideTitle, { fontSize: rf(isCompactHeight ? 18 : 20) }]}>{card.title}</Text>
                  <Text style={[styles.guideBody, { fontSize: rf(12), lineHeight: rf(17), marginTop: rsv(4) }]}>{card.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appTheme.colors.background,
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
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appTheme.colors.fieldInset,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.lineStrong,
    gap: 8,
  },
  backButtonText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.5,
  },
  headerPanel: {
    backgroundColor: appTheme.colors.field,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.lineStrong,
    ...appTheme.shadow.soft,
  },
  headerLabel: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1,
  },
  headerTitle: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textTransform: "uppercase",
    letterSpacing: 0.15,
  },
  headerCopy: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
  },
  scrollContent: {
    paddingTop: 2,
  },
  guideCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 104,
    backgroundColor: appTheme.colors.fieldRaised,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.line,
    ...appTheme.shadow.soft,
  },
  guideIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appTheme.colors.fieldInset,
    marginRight: 12,
  },
  guideTextBlock: {
    flex: 1,
  },
  guideTitle: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textTransform: "uppercase",
    letterSpacing: 0.12,
  },
  guideBody: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
  },
});
