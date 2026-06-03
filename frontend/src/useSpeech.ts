import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseSpeechOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  storageKey?: string;
};

type SpeakOptions = {
  id?: string;
};

type SpeechItem = {
  id: string;
  text: string;
};

function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function storedEnabled(storageKey: string): boolean {
  return localStorage.getItem(storageKey) !== "false";
}

function chooseVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const exact = voices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase());
  if (exact) return exact;

  const languagePrefix = lang.split("-")[0]?.toLowerCase();
  if (!languagePrefix) return null;

  return voices.find((voice) => voice.lang.toLowerCase().startsWith(`${languagePrefix}-`)) ?? null;
}

export function useSpeech({
  lang = "pt-PT",
  rate = 0.78,
  pitch = 1.05,
  volume = 1,
  storageKey = "ds_speech_enabled"
}: UseSpeechOptions = {}) {
  const supported = hasSpeechSynthesis();
  const [enabled, setEnabledState] = useState(() => storedEnabled(storageKey));
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const speechRunRef = useRef(0);

  const selectedVoice = useMemo(() => chooseVoice(voices, lang), [lang, voices]);

  useEffect(() => {
    if (!supported) return;

    function loadVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    speechRunRef.current += 1;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [supported]);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!enabled) stop();
    localStorage.setItem(storageKey, enabled ? "true" : "false");
  }, [enabled, stop, storageKey]);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
  }, []);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      const trimmed = text.trim();
      if (!supported || !enabled || !trimmed) return;

      const runId = speechRunRef.current + 1;
      speechRunRef.current = runId;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(trimmed);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      if (selectedVoice) utterance.voice = selectedVoice;

      const id = options.id ?? trimmed;
      utterance.onend = () => {
        if (speechRunRef.current === runId) setSpeakingId((current) => (current === id ? null : current));
      };
      utterance.onerror = () => {
        if (speechRunRef.current === runId) setSpeakingId((current) => (current === id ? null : current));
      };

      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    },
    [enabled, lang, pitch, rate, selectedVoice, supported, volume]
  );

  const speakSequence = useCallback(
    (items: SpeechItem[]) => {
      const readableItems = items
        .map((item) => ({ ...item, text: item.text.trim() }))
        .filter((item) => item.text);

      if (!supported || !enabled || readableItems.length === 0) return;

      const runId = speechRunRef.current + 1;
      speechRunRef.current = runId;
      window.speechSynthesis.cancel();

      function speakAt(index: number) {
        if (speechRunRef.current !== runId) return;
        const item = readableItems[index];
        if (!item) {
          setSpeakingId(null);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onend = () => speakAt(index + 1);
        utterance.onerror = () => speakAt(index + 1);

        setSpeakingId(item.id);
        window.speechSynthesis.speak(utterance);
      }

      speakAt(0);
    },
    [enabled, lang, pitch, rate, selectedVoice, supported, volume]
  );

  const isSpeaking = useCallback(
    (id?: string) => {
      if (!speakingId) return false;
      return id ? speakingId === id : true;
    },
    [speakingId]
  );

  return {
    supported,
    enabled,
    setEnabled,
    voicesReady: voices.length > 0,
    selectedVoice,
    speak,
    speakSequence,
    stop,
    isSpeaking
  };
}

export type SpeechControls = ReturnType<typeof useSpeech>;
