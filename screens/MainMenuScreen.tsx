import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ScreenShell from "@/components/ScreenShell";
import { appTheme } from "@/constants/theme";
import { clamp, useResponsiveTokens } from "@/hooks/useResponsiveTokens";

type MenuAction = {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: "/difficulty" | "/guide";
  isPrimary?: boolean;
};

const menuActions: MenuAction[] = [
  {
    label: "Play",
    icon: "sword-cross",
    route: "/difficulty",
    isPrimary: true,
  },
  {
    label: "Soldier's Guide",
    icon: "book-open-page-variant",
    route: "/guide",
  },
];

export default function MainMenuScreen() {
  const router = useRouter();
  const {
    width,
    safeHeight,
    rs,
    rsv,
    rf,
    layoutWidth,
    contentPaddingX,
    sectionGap,
    cardGap,
    cardPadding,
    panelRadius,
    isCompactHeight,
    isUltraCompactHeight,
  } = useResponsiveTokens();

  const contentWidth = Math.min(layoutWidth, rs(520));
  const titleSize = clamp(width * 0.115, rf(40), rf(isCompactHeight ? 54 : 62));
  const subtitleSize = clamp(width * 0.084, rf(30), rf(isCompactHeight ? 42 : 50));
  const crestSize = rs(isUltraCompactHeight ? 104 : isCompactHeight ? 120 : 134);
  const isScrollable = safeHeight < 680;

  return (
    <View style={styles.safeArea}>
      <View
        style={[
          styles.backgroundFog,
          {
            width: rs(230),
            height: rs(230),
            borderRadius: rs(115),
            top: -rsv(24),
            right: -rs(36),
          },
        ]}
      />
      <View
        style={[
          styles.backgroundEmber,
          {
            width: rs(290),
            height: rs(290),
            borderRadius: rs(145),
            bottom: -rsv(72),
            left: -rs(82),
          },
        ]}
      />

      <ScreenShell
        style={styles.root}
        maxWidth={contentWidth}
        horizontalPadding={contentPaddingX}
        topPadding={rsv(isUltraCompactHeight ? 10 : 18)}
        bottomPadding={rsv(isUltraCompactHeight ? 12 : 20)}
        scrollable={isScrollable}
      >
        <View
          style={[
            styles.contentRoot,
            !isScrollable && styles.contentRootCentered,
            { maxWidth: contentWidth },
          ]}
        >
          <View
            style={[
              styles.heroPanel,
              {
                borderRadius: panelRadius,
                paddingHorizontal: cardPadding,
                paddingTop: rsv(isUltraCompactHeight ? 18 : isCompactHeight ? 22 : 28),
                paddingBottom: rsv(isUltraCompactHeight ? 16 : isCompactHeight ? 20 : 24),
              },
            ]}
          >
            <View style={[styles.logoWrap, { marginBottom: rsv(isUltraCompactHeight ? 12 : 16) }]}>
              <View
                style={[
                  styles.logoCrest,
                  {
                    width: crestSize,
                    height: crestSize,
                    borderRadius: rs(28),
                  },
                ]}
              >
                <View style={[styles.logoHalo, { borderRadius: crestSize / 2 }]} />
                <View style={[styles.logoBanner, { borderRadius: rs(12) }]} />
                <Image
                  source={require("../assets/images/swords.png")}
                  style={{ width: crestSize * 0.82, height: crestSize * 0.82 }}
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 0.82 }]}>Salpakan:</Text>
            <Text
              style={[
                styles.title,
                styles.titleAccent,
                {
                  fontSize: subtitleSize,
                  lineHeight: subtitleSize * 0.9,
                  marginTop: rsv(isUltraCompactHeight ? -2 : -4),
                },
              ]}
            >
              Frontlines
            </Text>

            <Text
              style={[
                styles.sectionTitle,
                {
                  fontSize: rf(isCompactHeight ? 20 : 24),
                  marginTop: rsv(isUltraCompactHeight ? 12 : 16),
                },
              ]}
            >
              Choose your next order
            </Text>
          </View>

          <View
            style={[
              styles.actionPanel,
              {
                marginTop: sectionGap,
                borderRadius: rs(panelRadius - 2),
                paddingHorizontal: cardPadding,
                paddingVertical: rsv(isUltraCompactHeight ? 14 : 18),
              },
            ]}
          >
            <View style={[styles.actionStack, { gap: cardGap }]}>
              {menuActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={[
                    styles.actionButton,
                    action.isPrimary ? styles.actionButtonPrimary : styles.actionButtonSecondary,
                    {
                      borderRadius: rs(20),
                      paddingHorizontal: cardPadding,
                      paddingVertical: rsv(isUltraCompactHeight ? 14 : 16),
                    },
                  ]}
                  activeOpacity={0.88}
                  onPress={() => router.push(action.route)}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      action.isPrimary ? styles.iconWrapPrimary : styles.iconWrapSecondary,
                      {
                        width: rs(54),
                        height: rs(54),
                        borderRadius: rs(18),
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={action.icon}
                      size={rf(26)}
                      color={action.isPrimary ? appTheme.colors.ink : appTheme.colors.brassBright}
                    />
                  </View>

                  <Text style={[styles.actionLabel, { fontSize: rf(isCompactHeight ? 22 : 24) }]}>{action.label}</Text>

                  <MaterialCommunityIcons name="chevron-right" size={rf(30)} color={appTheme.colors.brassBright} />
                </TouchableOpacity>
              ))}
            </View>
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
    backgroundColor: "rgba(199, 163, 84, 0.12)",
  },
  backgroundEmber: {
    position: "absolute",
    backgroundColor: "rgba(180, 67, 52, 0.18)",
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
    alignItems: "center",
    backgroundColor: appTheme.colors.field,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.lineStrong,
    ...appTheme.shadow.hard,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoCrest: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appTheme.colors.fieldRaised,
    borderWidth: appTheme.borderWidth.emphasis,
    borderColor: appTheme.colors.lineStrong,
    overflow: "hidden",
    ...appTheme.shadow.hard,
  },
  logoHalo: {
    position: "absolute",
    width: "80%",
    height: "80%",
    backgroundColor: "rgba(226, 198, 124, 0.14)",
  },
  logoBanner: {
    position: "absolute",
    width: "120%",
    height: "20%",
    backgroundColor: "rgba(139, 46, 36, 0.28)",
    transform: [{ rotate: "-10deg" }],
  },
  title: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textTransform: "uppercase",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  titleAccent: {
    color: appTheme.colors.brassBright,
  },
  sectionTitle: {
    color: appTheme.colors.parchment,
    fontFamily: appTheme.fonts.body,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    textAlign: "center",
  },
  actionPanel: {
    width: "100%",
    backgroundColor: appTheme.colors.fieldRaised,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.line,
    ...appTheme.shadow.soft,
  },
  actionStack: {
    width: "100%",
  },
  actionButton: {
    width: "100%",
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: appTheme.borderWidth.regular,
  },
  actionButtonPrimary: {
    backgroundColor: appTheme.colors.alert,
    borderColor: appTheme.colors.brassBright,
  },
  actionButtonSecondary: {
    backgroundColor: appTheme.colors.fieldInset,
    borderColor: appTheme.colors.lineStrong,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconWrapPrimary: {
    backgroundColor: "rgba(246, 238, 216, 0.14)",
  },
  iconWrapSecondary: {
    backgroundColor: "rgba(226, 198, 124, 0.1)",
  },
  actionLabel: {
    flex: 1,
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textTransform: "uppercase",
    letterSpacing: 0.12,
  },
});
