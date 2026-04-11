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
  const playerRef = useRef<AudioPlayer | null>(null);
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

      const player = createAudioPlayer(MENU_BGM);
      player.loop = true;
      player.volume = DEFAULT_BGM_VOLUME;
      playerRef.current = player;
    })();

    return () => {
      mounted = false;
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.release();
        playerRef.current = null;
      }
    };
  }, []);

  const playTrack = useCallback(
    (track: Exclude<TrackName, null>) => {
      const player = playerRef.current;
      if (!player) return;

      const source = track === "menu" ? MENU_BGM : BATTLE_BGM;

      if (currentTrack !== track) {
        player.replace(source);
        setCurrentTrack(track);
      }

      player.loop = true;
      player.volume = isMuted ? 0 : DEFAULT_BGM_VOLUME;
      player.play();
    },
    [currentTrack, isMuted],
  );

  const playMenuMusic = useCallback(() => {
    playTrack("menu");
  }, [playTrack]);

  const playBattleMusic = useCallback(() => {
    playTrack("battle");
  }, [playTrack]);

  const stopMusic = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.pause();
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      const player = playerRef.current;
      if (player) {
        player.volume = next ? 0 : DEFAULT_BGM_VOLUME;
      }
      return next;
    });
  }, []);

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
