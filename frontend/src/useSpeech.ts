import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseSpeechOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  storageKey?: string;
  voiceStorageKey?: string;
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

function voiceRank(voice: SpeechSynthesisVoice, lang: string): number {
  const voiceLang = voice.lang.toLowerCase();
  const targetLang = lang.toLowerCase();
  const languagePrefix = targetLang.split("-")[0] ?? "";
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  let score = 0;

  if (voiceLang === targetLang) score += 100;
  else if (languagePrefix && voiceLang.startsWith(`${languagePrefix}-`)) score += 60;
  else if (voice.default) score += 10;

  if (name.includes("natural")) score += 18;
  if (name.includes("duarte")) score += 16;
  if (name.includes("microsoft")) score += 14;
  if (name.includes("apple")) score += 12;
  if (name.includes("google")) score += 10;
  if (voice.localService) score += 4;
  if (voice.default) score += 3;

  return score;
}

function sortVoices(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice[] {
  return [...voices].sort((left, right) => {
    const scoreDiff = voiceRank(right, lang) - voiceRank(left, lang);
    if (scoreDiff !== 0) return scoreDiff;
    return left.name.localeCompare(right.name, "pt");
  });
}

function chooseVoice(voices: SpeechSynthesisVoice[], lang: string, selectedVoiceURI: string | null): SpeechSynthesisVoice | null {
  const storedVoice = selectedVoiceURI ? voices.find((voice) => voice.voiceURI === selectedVoiceURI) : null;
  if (storedVoice) return storedVoice;

  const rankedVoices = sortVoices(voices, lang);
  const rankedMatch = rankedVoices.find((voice) => voiceRank(voice, lang) >= 60);
  if (rankedMatch) return rankedMatch;

  const languagePrefix = lang.split("-")[0]?.toLowerCase();
  if (!languagePrefix) return rankedVoices[0] ?? null;

  return rankedVoices.find((voice) => voice.lang.toLowerCase().startsWith(`${languagePrefix}-`)) ?? rankedVoices[0] ?? null;
}

function voiceOptionLabel(voice: SpeechSynthesisVoice): string {
  return `${voice.name} (${voice.lang})`;
}

const SPEECH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bO[-\s]soto[-\s]gari\b/gi, "Ô soto gari"],
  [/\bO[-\s]uchi[-\s]gari\b/gi, "Ô uchi gari"],
  [/\bSasae[-\s]tsurikomi[-\s]ashi\b/gi, "Sassaê tsurikomi ashi"],
  [/\bKo[-\s]soto[-\s]gari\b/gi, "Kô soto gari"],
  [/\bKo[-\s]uchi[-\s]gari\b/gi, "Kô uchi gari"],
  [/\bMorote[-\s]seoi[-\s]nage\b/gi, "Morotê seoi naguê"],
  [/\bSeoi[-\s]nage\b/gi, "Seoi naguê"],
  [/\bKesa[-\s]gatame\b/gi, "Kêssa gatamê"],
  [/\bKami[-\s]shiho[-\s]gatame\b/gi, "Kami shiho gatamê"],
  [/\bYoko[-\s]shiho[-\s]gatame\b/gi, "Yoko shiho gatamê"],
  [/\bUke\b/g, "ukê"],
  [/\bTori\b/g, "tóri"],
  [/\bNage[-\s]waza\b/gi, "Naguê wazá"],
  [/\bNe[-\s]waza\b/gi, "Nê wazá"],
  [/\bAshi[-\s]waza\b/gi, "Áshi wazá"],
  [/\bOsae[-\s]waza\b/gi, "Ossaê wazá"],
  [/\bRen[-\s]raku[-\s]waza\b/gi, "Ren raku wazá"],
  [/\bKaeshi[-\s]waza\b/gi, "Kaeshi wazá"]
];

export function normalizeSpeechText(text: string): string {
  return SPEECH_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text)
    .replace(/([A-Za-zÀ-ÿ])[-‐‑‒–—]([A-Za-zÀ-ÿ])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

export function useSpeech({
  lang = "pt-PT",
  rate = 0.78,
  pitch = 1.05,
  volume = 1,
  storageKey = "ds_speech_enabled",
  voiceStorageKey = "ds_speech_voice_uri"
}: UseSpeechOptions = {}) {
  const supported = hasSpeechSynthesis();
  const [enabled, setEnabledState] = useState(() => storedEnabled(storageKey));
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURIState] = useState(() => localStorage.getItem(voiceStorageKey));
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const speechRunRef = useRef(0);

  const availableVoices = useMemo(() => sortVoices(voices, lang).filter((voice) => voiceRank(voice, lang) >= 60), [lang, voices]);
  const selectedVoice = useMemo(() => chooseVoice(voices, lang, selectedVoiceURI), [lang, selectedVoiceURI, voices]);

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

  const setSelectedVoiceURI = useCallback(
    (voiceURI: string) => {
      const next = voiceURI || null;
      setSelectedVoiceURIState(next);
      if (next) localStorage.setItem(voiceStorageKey, next);
      else localStorage.removeItem(voiceStorageKey);
    },
    [voiceStorageKey]
  );

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      const trimmed = normalizeSpeechText(text);
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
        .map((item) => ({ ...item, text: normalizeSpeechText(item.text) }))
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
    availableVoices,
    selectedVoice,
    selectedVoiceURI: selectedVoice?.voiceURI ?? selectedVoiceURI ?? "",
    setSelectedVoiceURI,
    voiceOptionLabel,
    speak,
    speakSequence,
    stop,
    isSpeaking
  };
}

export type SpeechControls = ReturnType<typeof useSpeech>;
