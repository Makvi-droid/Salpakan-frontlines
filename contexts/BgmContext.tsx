import { BATTLE_BGM, DEFAULT_BGM_VOLUME, MENU_BGM } from "@/constants/audio";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type TrackName = "menu" | "battle" | null;

type BgmContextValue = {
  isMuted: boolean;
  currentTrack: TrackName;
  playMenuMusic: () => void;
  playBattleMusic: () => void;
  stopMusic: () => void;
  toggleMute: () => void;
};

const BgmContext = createContext<BgmContextValue | null>(null);

export function BgmProvider({ children }: { children: React.ReactNode }) {
  const menuPlayerRef = useRef<AudioPlayer | null>(null);
  const battlePlayerRef = useRef<AudioPlayer | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<TrackName>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "doNotMix",
      });

      if (!mounted) return;

      const menuPlayer = createAudioPlayer(MENU_BGM);
      menuPlayer.loop = true;
      menuPlayer.volume = DEFAULT_BGM_VOLUME;

      const battlePlayer = createAudioPlayer(BATTLE_BGM);
      battlePlayer.loop = true;
      battlePlayer.volume = DEFAULT_BGM_VOLUME;

      menuPlayerRef.current = menuPlayer;
      battlePlayerRef.current = battlePlayer;
    })();

    return () => {
      mounted = false;

      if (menuPlayerRef.current) {
        menuPlayerRef.current.pause();
        menuPlayerRef.current.release();
        menuPlayerRef.current = null;
      }

      if (battlePlayerRef.current) {
        battlePlayerRef.current.pause();
        battlePlayerRef.current.release();
        battlePlayerRef.current = null;
      }
    };
  }, []);

  const applyVolume = useCallback((muted: boolean) => {
    const volume = muted ? 0 : DEFAULT_BGM_VOLUME;

    if (menuPlayerRef.current) menuPlayerRef.current.volume = volume;
    if (battlePlayerRef.current) battlePlayerRef.current.volume = volume;
  }, []);

  const playMenuMusic = useCallback(() => {
    const menuPlayer = menuPlayerRef.current;
    const battlePlayer = battlePlayerRef.current;
    if (!menuPlayer || !battlePlayer) return;

    battlePlayer.pause();
    void menuPlayer.seekTo(0);
    menuPlayer.loop = true;
    menuPlayer.volume = isMuted ? 0 : DEFAULT_BGM_VOLUME;
    menuPlayer.play();

    setCurrentTrack("menu");
  }, [isMuted]);

  const playBattleMusic = useCallback(() => {
    const menuPlayer = menuPlayerRef.current;
    const battlePlayer = battlePlayerRef.current;
    if (!menuPlayer || !battlePlayer) return;

    menuPlayer.pause();
    void battlePlayer.seekTo(0);
    battlePlayer.loop = true;
    battlePlayer.volume = isMuted ? 0 : DEFAULT_BGM_VOLUME;
    battlePlayer.play();

    setCurrentTrack("battle");
  }, [isMuted]);

  const stopMusic = useCallback(() => {
    menuPlayerRef.current?.pause();
    battlePlayerRef.current?.pause();
    setCurrentTrack(null);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      applyVolume(next);
      return next;
    });
  }, [applyVolume]);

  const value = useMemo(
    () => ({
      isMuted,
      currentTrack,
      playMenuMusic,
      playBattleMusic,
      stopMusic,
      toggleMute,
    }),
    [
      isMuted,
      currentTrack,
      playMenuMusic,
      playBattleMusic,
      stopMusic,
      toggleMute,
    ],
  );

  return <BgmContext.Provider value={value}>{children}</BgmContext.Provider>;
}

export function useBgm() {
  const ctx = useContext(BgmContext);
  if (!ctx) {
    throw new Error("useBgm must be used inside BgmProvider");
  }
  return ctx;
}
