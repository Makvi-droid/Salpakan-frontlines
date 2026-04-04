import React from "react";
import { StyleSheet, View } from "react-native";
import { ColonelAbilityButton } from "./ColonelAbilityButton";
import { FlagAbilityButton } from "./FlagAbilityButton";
import { FourStarPushButton } from "./FourStarPushButton";
import { GeneralChargeButton } from "./GeneralChargeButton";
import { SpyAbilityButton } from "./SpyAbilityButton";

type Props = {
  selectedPieceIsFlag: boolean;
  selectedPieceIsSpy: boolean;
  selectedPieceIsGeneralFiveStar: boolean;
  /** True when the selected battle tile is the player's 4-Star General */
  selectedPieceIsGeneralFourStar: boolean;
  /** True when the selected battle tile is the player's Colonel */
  selectedPieceIsColonel: boolean;
  winner: boolean;
  // Flag
  flagSwapActive: boolean;
  flagSwapCooldownUntil: number | null;
  onFlagPress: () => void;
  // Spy
  spyRevealCooldownUntil: number | null;
  onSpyPress: () => void;
  // 5-Star General
  generalChargeActive: boolean;
  generalChargeCooldownUntil: number | null;
  onGeneralPress: () => void;
  // 4-Star General push
  fourStarPushActive: boolean;
  fourStarPushCooldownUntil: number | null;
  onFourStarPushPress: () => void;
  // Colonel diagonal reveal
  colonelRevealActive: boolean;
  colonelRevealCooldownUntil: number | null;
  onColonelPress: () => void;
  // Layout
  verticalSectionGap: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
};

export function AbilityPanel({
  selectedPieceIsFlag,
  selectedPieceIsSpy,
  selectedPieceIsGeneralFiveStar,
  selectedPieceIsGeneralFourStar,
  selectedPieceIsColonel,
  winner,
  flagSwapActive,
  flagSwapCooldownUntil,
  onFlagPress,
  spyRevealCooldownUntil,
  onSpyPress,
  generalChargeActive,
  generalChargeCooldownUntil,
  onGeneralPress,
  fourStarPushActive,
  fourStarPushCooldownUntil,
  onFourStarPushPress,
  colonelRevealActive,
  colonelRevealCooldownUntil,
  onColonelPress,
  verticalSectionGap,
  rf,
  rs,
  rsv,
}: Props) {
  const hasAbility =
    !winner &&
    (selectedPieceIsFlag ||
      selectedPieceIsSpy ||
      selectedPieceIsGeneralFiveStar ||
      selectedPieceIsGeneralFourStar ||
      fourStarPushActive ||
      selectedPieceIsColonel ||
      colonelRevealActive); // ← keep panel alive while target-select is armed

  // Return null entirely so no space is taken when nothing is active.
  if (!hasAbility) return null;

  return (
    <View style={[styles.container, { marginBottom: verticalSectionGap }]}>
      {selectedPieceIsFlag && (
        <FlagAbilityButton
          visible
          active={flagSwapActive}
          cooldownUntil={flagSwapCooldownUntil}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onPress={onFlagPress}
        />
      )}
      {selectedPieceIsSpy && (
        <SpyAbilityButton
          visible
          cooldownUntil={spyRevealCooldownUntil}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onPress={onSpyPress}
        />
      )}
      {selectedPieceIsGeneralFiveStar && (
        <GeneralChargeButton
          visible
          cooldownUntil={generalChargeCooldownUntil}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onPress={onGeneralPress}
        />
      )}
      {/* 4-Star General: Iron Shove push ability */}
      {(selectedPieceIsGeneralFourStar || fourStarPushActive) && (
        <FourStarPushButton
          visible
          active={fourStarPushActive}
          cooldownUntil={fourStarPushCooldownUntil}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onPress={onFourStarPushPress}
        />
      )}
      {/* Colonel: Field Scope diagonal reveal ability */}
      {(selectedPieceIsColonel || colonelRevealActive) && (
        <ColonelAbilityButton
          visible
          active={colonelRevealActive}
          cooldownUntil={colonelRevealCooldownUntil}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onPress={onColonelPress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
