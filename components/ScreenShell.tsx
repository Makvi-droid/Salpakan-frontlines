import { ReactNode } from "react";
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScreenShellProps = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  maxWidth?: number;
  horizontalPadding?: number;
  topPadding?: number;
  bottomPadding?: number;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
};

export default function ScreenShell({
  children,
  contentStyle,
  maxWidth,
  horizontalPadding = 0,
  topPadding = 0,
  bottomPadding = 0,
  style,
  scrollable = false,
}: ScreenShellProps) {
  const insets = useSafeAreaInsets();

  if (scrollable) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.root,
          style,
          {
            paddingLeft: insets.left + horizontalPadding,
            paddingRight: insets.right + horizontalPadding,
            paddingTop: insets.top + topPadding,
            paddingBottom: insets.bottom + bottomPadding,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.scrollContent, { maxWidth }, contentStyle]}>{children}</View>
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        styles.root,
        style,
        {
          paddingLeft: insets.left + horizontalPadding,
          paddingRight: insets.right + horizontalPadding,
          paddingTop: insets.top + topPadding,
          paddingBottom: insets.bottom + bottomPadding,
        },
      ]}
    >
      <View style={[styles.content, { maxWidth }, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  root: {
    flex: 1,
    alignItems: "center",
  },
  content: {
    width: "100%",
    flex: 1,
  },
  scrollContent: {
    width: "100%",
  },
});
