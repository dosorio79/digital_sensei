import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  finishCurrentUtterance,
  getSpeechCancelCalls,
  getSpeechUtterances,
  installSpeechSynthesisMock,
  removeSpeechSynthesisMock
} from "./test/audioMocks";
import { normalizeSpeechText, useSpeech } from "./useSpeech";

describe("useSpeech", () => {
  it("reports unavailable when speech synthesis is missing", () => {
    removeSpeechSynthesisMock();

    const { result } = renderHook(() => useSpeech());

    expect(result.current.supported).toBe(false);
  });

  it("persists enabled state in localStorage", () => {
    const { result } = renderHook(() => useSpeech());

    act(() => result.current.setEnabled(false));

    expect(result.current.enabled).toBe(false);
    expect(localStorage.getItem("ds_speech_enabled")).toBe("false");
  });

  it("speaks with pt-PT defaults and the best matching voice", async () => {
    installSpeechSynthesisMock({
      voices: [
        { lang: "en-US", name: "English" },
        { lang: "pt-BR", name: "Portuguese Brazil", voiceURI: "pt-BR" },
        { lang: "pt-PT", name: "Portuguese Portugal", voiceURI: "basic-pt-PT" },
        { lang: "pt-PT", name: "Microsoft Helia Natural", voiceURI: "helia-natural" }
      ]
    });
    const { result } = renderHook(() => useSpeech());

    await waitFor(() => expect(result.current.selectedVoice?.lang).toBe("pt-PT"));
    act(() => result.current.speak("Olá", { id: "hello" }));

    const utterance = getSpeechUtterances()[0];
    expect(utterance.text).toBe("Olá");
    expect(utterance.lang).toBe("pt-PT");
    expect(utterance.rate).toBe(0.78);
    expect(utterance.pitch).toBe(1.05);
    expect(utterance.volume).toBe(1);
    expect(utterance.voice?.name).toBe("Microsoft Helia Natural");
    expect(getSpeechCancelCalls()).toBe(1);
  });

  it("persists a selected voice and uses it for sequences", async () => {
    installSpeechSynthesisMock({
      voices: [
        { lang: "pt-PT", name: "Portuguese Portugal", voiceURI: "basic-pt-PT" },
        { lang: "pt-BR", name: "Portuguese Brazil", voiceURI: "pt-BR" }
      ]
    });
    const { result } = renderHook(() => useSpeech());

    await waitFor(() => expect(result.current.availableVoices).toHaveLength(2));
    act(() => result.current.setSelectedVoiceURI("pt-BR"));
    act(() => result.current.speakSequence([{ id: "hello", text: "Olá" }]));

    expect(localStorage.getItem("ds_speech_voice_uri")).toBe("pt-BR");
    expect(result.current.selectedVoice?.name).toBe("Portuguese Brazil");
    expect(getSpeechUtterances()[0].voice?.voiceURI).toBe("pt-BR");
  });

  it("falls back when the stored voice is missing", async () => {
    localStorage.setItem("ds_speech_voice_uri", "missing-voice");
    installSpeechSynthesisMock({
      voices: [{ lang: "pt-PT", name: "Portuguese Portugal", voiceURI: "basic-pt-PT" }]
    });
    const { result } = renderHook(() => useSpeech());

    await waitFor(() => expect(result.current.selectedVoice?.voiceURI).toBe("basic-pt-PT"));
  });

  it("normalizes judo text for speech without requiring stored audio", () => {
    expect(normalizeSpeechText("O-soto-gari pertence a Ashi Waza.")).toBe("Ô soto gari pertence a Áshi wazá.");
    expect(normalizeSpeechText("Kesa Gatame")).toBe("Kêssa gatamê");
  });

  it("cancels existing speech before starting a new utterance", () => {
    const { result } = renderHook(() => useSpeech());

    act(() => result.current.speak("Primeira", { id: "first" }));
    act(() => result.current.speak("Segunda", { id: "second" }));

    expect(getSpeechCancelCalls()).toBe(2);
    expect(getSpeechUtterances().map((utterance) => utterance.text)).toEqual(["Primeira", "Segunda"]);
    expect(result.current.isSpeaking("second")).toBe(true);
  });

  it("reads a sequence in order and tracks the active item", () => {
    const { result } = renderHook(() => useSpeech());

    act(() =>
      result.current.speakSequence([
        { id: "question", text: "Pergunta" },
        { id: "answer-a", text: "A" },
        { id: "answer-b", text: "B" }
      ])
    );

    expect(result.current.isSpeaking("question")).toBe(true);
    expect(getSpeechUtterances().map((utterance) => utterance.text)).toEqual(["Pergunta"]);

    act(() => finishCurrentUtterance());

    expect(result.current.isSpeaking("answer-a")).toBe(true);
    expect(getSpeechUtterances().map((utterance) => utterance.text)).toEqual(["Pergunta", "A"]);

    act(() => finishCurrentUtterance());

    expect(result.current.isSpeaking("answer-b")).toBe(true);
    expect(getSpeechUtterances().map((utterance) => utterance.text)).toEqual(["Pergunta", "A", "B"]);
  });

  it("stops speech and clears active state", () => {
    const { result } = renderHook(() => useSpeech());

    act(() => result.current.speak("Olá", { id: "hello" }));
    act(() => result.current.stop());

    expect(result.current.isSpeaking()).toBe(false);
    expect(getSpeechCancelCalls()).toBe(2);
  });
});
