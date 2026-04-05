import React from "react";
import { StyleSheet, View } from "react-native";
import { CaptainScanButton } from "./CaptainScanButton";
import { ColonelAbilityButton } from "./ColonelAbilityButton";
import { FlagAbilityButton } from "./FlagAbilityButton";
import { FourStarPushButton } from "./FourStarPushButton";
import { GeneralChargeButton } from "./GeneralChargeButton";
import { LtColonelStunButton } from "./LtColonelStunButton";
import { MajorAbilityButton } from "./MajorAbilityButton";
import { OneStarGeneralButton } from "./OneStarGeneralButton";
import { SpyAbilityButton } from "./SpyAbilityButton";
import { TwoStarGeneralButton } from "./TwoStarGeneralButton";

type Props = {
  selectedPieceIsFlag: boolean;
  selectedPieceIsSpy: boolean;
  selectedPieceIsGeneralFiveStar: boolean;
  /** True when the selected battle tile is the player's 4-Star General */
  selectedPieceIsGeneralFourStar: boolean;
  /** True when the selected battle tile is the player's Colonel */
  selectedPieceIsColonel: boolean;
  /** True when the selected battle tile is the player's Lt. Colonel */
  selectedPieceIsLtColonel: boolean;
  /** True when the selected battle tile is the player's Major */
  selectedPieceIsMajor: boolean;
  /** True when the selected battle tile is the player's Captain */
  selectedPieceIsCaptain: boolean;
  /** True when the selected battle tile is the player's 1-Star General */
  selectedPieceIsOneStarGeneral: boolean;
  /** True when the selected battle tile is the player's 2-Star General */
  selectedPieceIsTwoStarGeneral: boolean;
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
  // Lt. Colonel stun (Suppression Fire)
  ltColonelStunActive: boolean;
  ltColonelStunCooldownUntil: number | null;
  onLtColonelStunPress: () => void;
  // Major swap (Tactical Shift)
  majorSwapActive: boolean;
  majorSwapCooldownUntil: number | null;
  onMajorSwapPress: () => void;
  // Captain orthogonal scan (Threat Scan)
  captainScanCooldownUntil: number | null;
  onCaptainScanPress: () => void;
  // 1-Star General bonus move (Press the Advantage)
  oneStarBonusMoveActive: boolean;
  oneStarBonusMoveCooldownUntil: number | null;
  // 2-Star General (Hold the Line)
  twoStarActive: boolean;
  twoStarCooldownUntil: number | null;
  onTwoStarPress: () => void;
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
  selectedPieceIsLtColonel,
  selectedPieceIsMajor,
  selectedPieceIsCaptain,
  selectedPieceIsOneStarGeneral,
  selectedPieceIsTwoStarGeneral,
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
  ltColonelStunActive,
  ltColonelStunCooldownUntil,
  onLtColonelStunPress,
  majorSwapActive,
  majorSwapCooldownUntil,
  onMajorSwapPress,
  captainScanCooldownUntil,
  onCaptainScanPress,
  oneStarBonusMoveActive,
  oneStarBonusMoveCooldownUntil,
  twoStarActive,
  twoStarCooldownUntil,
  onTwoStarPress,
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
      colonelRevealActive ||
      selectedPieceIsLtColonel ||
      ltColonelStunActive ||
      selectedPieceIsMajor ||
      majorSwapActive ||
      selectedPieceIsCaptain ||
      selectedPieceIsOneStarGeneral ||
      oneStarBonusMoveActive ||
      selectedPieceIsTwoStarGeneral ||
      twoStarActive);

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
      {/* Lt. Colonel: Suppression Fire stun ability */}
      {(selectedPieceIsLtColonel || ltColonelStunActive) && (
        <LtColonelStunButton
          visible
          active={ltColonelStunActive}
          cooldownUntil={ltColonelStunCooldownUntil}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onPress={onLtColonelStunPress}
        />
      )}
      {/* Major: Tactical Shift swap ability */}
      {(selectedPieceIsMajor || majorSwapActive) && (
        <MajorAbilityButton
          visible
          active={majorSwapActive}
          cooldownUntil={majorSwapCooldownUntil}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onPress={onMajorSwapPress}
        />
      )}
      {/* Captain: Threat Scan orthogonal reveal ability */}
      {selectedPieceIsCaptain && (
        <CaptainScanButton
          visible
          cooldownUntil={captainScanCooldownUntil}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onPress={onCaptainScanPress}
        />
      )}
      {/* 1-Star General: Press the Advantage bonus move — display only (passive trigger) */}
      {(selectedPieceIsOneStarGeneral || oneStarBonusMoveActive) && (
        <OneStarGeneralButton
          visible
          active={oneStarBonusMoveActive}
          cooldownUntil={oneStarBonusMoveCooldownUntil}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onPress={() => {}}
        />
      )}
      {/* 2-Star General: Hold the Line — restrict backward movement for 2 rounds */}
      {(selectedPieceIsTwoStarGeneral || twoStarActive) && (
        <TwoStarGeneralButton
          visible
          active={twoStarActive}
          cooldownUntil={twoStarCooldownUntil}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onPress={onTwoStarPress}
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
