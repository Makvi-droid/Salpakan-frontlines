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
    title: "1. Know the match",
    body: "Salpakan: Frontlines opens with a formation phase. You are arranging your ranks before the first clash begins.",
    icon: "flag-variant",
  },
  {
    title: "2. Open the reserve",
    body: "Choose a difficulty, open the reserve, and review the pieces that still need a starting tile.",
    icon: "archive-outline",
  },
  {
    title: "3. Place each rank",
    body: "Tap a rank, then tap a highlighted frontline tile. Tap a placed unit to reposition it inside the setup zone.",
    icon: "gesture-tap-button",
  },
  {
    title: "4. Use quick commands",
    body: "Use Random for a legal fast setup, or reset and adjust the formation until it feels right.",
    icon: "lightning-bolt-outline",
  },
  {
    title: "5. Confirm ready",
    body: "Once every rank is deployed, press Ready to lock the opening formation and proceed.",
    icon: "check-circle-outline",
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
            width: rs(210),
            height: rs(210),
            borderRadius: rs(105),
            top: -rsv(10),
            right: -rs(28),
          },
        ]}
      />
      <View
        style={[
          styles.backgroundEmber,
          {
            width: rs(240),
            height: rs(240),
            borderRadius: rs(120),
            bottom: -rsv(60),
            left: -rs(40),
          },
        ]}
      />

      <ScreenShell
        style={styles.root}
        maxWidth={contentWidth}
        horizontalPadding={contentPaddingX}
        topPadding={rsv(isUltraCompactHeight ? 10 : 16)}
        bottomPadding={rsv(isUltraCompactHeight ? 12 : 20)}
        scrollable
      >
        <View style={[styles.contentRoot, { maxWidth: contentWidth }]}>
          <TouchableOpacity
            style={[styles.backButton, { marginBottom: sectionGap, borderRadius: rs(14), paddingHorizontal: rs(12), paddingVertical: rsv(9) }]}
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
                paddingVertical: rsv(isUltraCompactHeight ? 14 : 18),
                marginBottom: sectionGap,
              },
            ]}
          >
            <Text style={[styles.headerLabel, { fontSize: rf(10) }]}>FIELD MANUAL</Text>
            <Text style={[styles.headerTitle, { fontSize: rf(isCompactHeight ? 26 : 30), marginTop: rsv(4) }]}>Learn the opening drill</Text>
            <Text style={[styles.headerCopy, { fontSize: rf(12), lineHeight: rf(17), marginTop: rsv(8) }]}>
              Follow these orders to build a legal formation and get into the match without guesswork.
            </Text>
          </View>

          <View
            style={[
              styles.tipPanel,
              {
                borderRadius: rs(panelRadius - 2),
                paddingHorizontal: cardPadding,
                paddingVertical: rsv(isUltraCompactHeight ? 12 : 14),
                marginBottom: sectionGap,
              },
            ]}
          >
            <Text style={[styles.tipLabel, { fontSize: rf(10) }]}>QUICK READ</Text>
            <Text style={[styles.tipText, { fontSize: rf(12), lineHeight: rf(16), marginTop: rsv(4) }]}>
              The red-highlighted rows are your setup zone. Every rank must be placed there before Ready becomes available.
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
                <View style={[styles.guideIconWrap, { width: rs(44), height: rs(44), borderRadius: rs(14) }]}>
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
    backgroundColor: "rgba(199, 163, 84, 0.1)",
  },
  backgroundEmber: {
    position: "absolute",
    backgroundColor: "rgba(180, 67, 52, 0.16)",
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
    backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.commandSecondary.borderColor,
    gap: 8,
  },
  backButtonText: {
    color: appTheme.surfaces.commandSecondary.textColor,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.5,
  },
  headerPanel: {
    backgroundColor: appTheme.surfaces.hero.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.hero.borderColor,
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
  tipPanel: {
    backgroundColor: appTheme.surfaces.inset.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.inset.borderColor,
  },
  tipLabel: {
    color: appTheme.surfaces.instruction.accentColor,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1,
  },
  tipText: {
    color: appTheme.surfaces.instruction.textColor,
    fontFamily: appTheme.fonts.body,
  },
  scrollContent: {
    paddingTop: 2,
  },
  guideCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 108,
    backgroundColor: appTheme.surfaces.section.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.section.borderColor,
    ...appTheme.shadow.soft,
  },
  guideIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appTheme.surfaces.inset.backgroundColor,
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
