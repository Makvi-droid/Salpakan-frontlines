import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ScreenShell from "@/components/ScreenShell";
import { appTheme } from "@/constants/theme";
import { clamp, useResponsiveTokens } from "@/hooks/useResponsiveTokens";

type MenuAction = {
  label: string;
  note: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: "/difficulty" | "/guide";
  isPrimary?: boolean;
};

const menuActions: MenuAction[] = [
  {
    label: "Play",
    note: "Choose your command difficulty and deploy to the board.",
    icon: "sword-cross",
    route: "/difficulty",
    isPrimary: true,
  },
  {
    label: "Soldier's Guide",
    note: "Learn the basics of setup, controls, and your first march.",
    icon: "book-open-page-variant",
    route: "/guide",
  },
];

export default function MainMenuScreen() {
  const router = useRouter();
  const { width, rs, rsv, rf, maxContentWidth, isCompactHeight, isUltraCompactHeight } = useResponsiveTokens();

  const contentWidth = Math.min(maxContentWidth, rs(500));
  const titleSize = clamp(width * 0.13, rf(40), rf(isCompactHeight ? 58 : 68));
  const subtitleSize = clamp(width * 0.09, rf(32), rf(isCompactHeight ? 44 : 52));
  const buttonGap = rsv(isUltraCompactHeight ? 10 : 14);

  return (
    <View style={styles.safeArea}>
      <View
        style={[
          styles.backgroundFog,
          {
            width: rs(210),
            height: rs(210),
            borderRadius: rs(105),
            top: -rsv(18),
            right: -rs(38),
          },
        ]}
      />
      <View
        style={[
          styles.backgroundEmber,
          {
            width: rs(260),
            height: rs(260),
            borderRadius: rs(130),
            bottom: -rsv(56),
            left: -rs(72),
          },
        ]}
      />

      <ScreenShell
        style={styles.root}
        maxWidth={contentWidth}
        horizontalPadding={rs(16)}
        topPadding={rsv(isUltraCompactHeight ? 10 : isCompactHeight ? 14 : 18)}
        bottomPadding={rsv(isUltraCompactHeight ? 10 : isCompactHeight ? 12 : 16)}
      >
        <View style={[styles.contentRoot, { maxWidth: contentWidth }]}>
          <View
            style={[
              styles.heroPanel,
              {
                borderRadius: rs(28),
                paddingHorizontal: rs(isUltraCompactHeight ? 16 : 22),
                paddingVertical: rsv(isUltraCompactHeight ? 18 : isCompactHeight ? 24 : 32),
              },
            ]}
          >
            <Text style={[styles.kicker, { fontSize: rf(11), marginBottom: rsv(8) }]}>TACTICAL BOARD WARFARE</Text>
            <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 0.82 }]}>Salpakan:</Text>
            <Text style={[styles.title, styles.titleAccent, { fontSize: subtitleSize, lineHeight: subtitleSize * 0.9 }]}>Frontlines</Text>
            <Text
              style={[
                styles.heroCopy,
                {
                  fontSize: rf(isCompactHeight ? 13 : 15),
                  lineHeight: rf(isCompactHeight ? 18 : 21),
                  marginTop: rsv(10),
                },
              ]}
            >
              Take command, shape your formation, and meet the enemy line with brass, nerve, and timing.
            </Text>
          </View>

          <View
            style={[
              styles.actionPanel,
              {
                marginTop: rsv(isUltraCompactHeight ? 14 : 18),
                borderRadius: rs(24),
                paddingHorizontal: rs(14),
                paddingVertical: rsv(isUltraCompactHeight ? 14 : 18),
              },
            ]}
          >
            <Text style={[styles.sectionLabel, { fontSize: rf(10) }]}>MAIN MENU</Text>
            <Text style={[styles.sectionTitle, { fontSize: rf(isCompactHeight ? 24 : 28), marginBottom: rsv(10) }]}>Choose your next order</Text>

            <View style={[styles.actionStack, { gap: buttonGap }]}>
              {menuActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={[
                    styles.actionButton,
                    action.isPrimary ? styles.actionButtonPrimary : styles.actionButtonSecondary,
                    {
                      borderRadius: rs(20),
                      paddingHorizontal: rs(14),
                      paddingVertical: rsv(isUltraCompactHeight ? 12 : 14),
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
                        width: rs(50),
                        height: rs(50),
                        borderRadius: rs(16),
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={action.icon}
                      size={rf(24)}
                      color={action.isPrimary ? appTheme.colors.ink : appTheme.colors.brassBright}
                    />
                  </View>

                  <View style={styles.actionTextBlock}>
                    <Text style={[styles.actionLabel, { fontSize: rf(isCompactHeight ? 22 : 24) }]}>{action.label}</Text>
                    <Text style={[styles.actionNote, { fontSize: rf(12), lineHeight: rf(16) }]}>{action.note}</Text>
                  </View>

                  <MaterialCommunityIcons name="chevron-right" size={rf(28)} color={appTheme.colors.brassBright} />
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
    backgroundColor: "rgba(199, 163, 84, 0.1)",
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
    flex: 1,
    width: "100%",
    justifyContent: "center",
  },
  heroPanel: {
    backgroundColor: appTheme.colors.field,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.lineStrong,
    ...appTheme.shadow.hard,
  },
  kicker: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1.2,
  },
  title: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  titleAccent: {
    color: appTheme.colors.brassBright,
  },
  heroCopy: {
    maxWidth: "92%",
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
  },
  actionPanel: {
    backgroundColor: appTheme.colors.fieldRaised,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.line,
    ...appTheme.shadow.soft,
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
  actionStack: {
    width: "100%",
  },
  actionButton: {
    width: "100%",
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
    marginRight: 12,
  },
  iconWrapPrimary: {
    backgroundColor: "rgba(246, 238, 216, 0.14)",
  },
  iconWrapSecondary: {
    backgroundColor: "rgba(226, 198, 124, 0.08)",
  },
  actionTextBlock: {
    flex: 1,
  },
  actionLabel: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textTransform: "uppercase",
    letterSpacing: 0.12,
  },
  actionNote: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
  },
});
