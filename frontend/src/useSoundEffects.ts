import { useCallback, useEffect, useRef, useState } from "react";

type UseSoundEffectsOptions = {
  storageKey?: string;
};

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;

  const audioWindow = window as Window &
    typeof globalThis & {
      webkitAudioContext?: AudioContextConstructor;
    };

  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

function storedEnabled(storageKey: string): boolean {
  return localStorage.getItem(storageKey) !== "false";
}

export function useSoundEffects({ storageKey = "ds_sound_enabled" }: UseSoundEffectsOptions = {}) {
  const supported = getAudioContextConstructor() !== null;
  const [enabled, setEnabledState] = useState(() => storedEnabled(storageKey));
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, enabled ? "true" : "false");
  }, [enabled, storageKey]);

  useEffect(() => {
    return () => {
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
  }, []);

  const getContext = useCallback(() => {
    const AudioContextClass = getAudioContextConstructor();
    if (!AudioContextClass) return null;

    contextRef.current ??= new AudioContextClass();
    return contextRef.current;
  }, []);

  const playCorrect = useCallback(() => {
    if (!enabled || !supported) return;

    const context = getContext();
    if (!context) return;

    void context.resume().catch(() => undefined);

    const startAt = context.currentTime + 0.015;
    const notes = [
      { frequency: 523.25, start: startAt, duration: 0.11 },
      { frequency: 659.25, start: startAt + 0.1, duration: 0.16 }
    ];

    notes.forEach(({ frequency, start, duration }) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(start);
      oscillator.stop(start + duration + 0.03);
    });
  }, [enabled, getContext, supported]);

  return {
    supported,
    enabled,
    setEnabled,
    playCorrect
  };
}

export type SoundEffectControls = ReturnType<typeof useSoundEffects>;
