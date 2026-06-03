import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  finishCurrentUtterance,
  getSpeechCancelCalls,
  getSpeechUtterances,
  installSpeechSynthesisMock,
  removeSpeechSynthesisMock
} from "./test/audioMocks";
import { useSpeech } from "./useSpeech";

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
        { lang: "pt-PT", name: "Portuguese Portugal" }
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
    expect(utterance.voice?.name).toBe("Portuguese Portugal");
    expect(getSpeechCancelCalls()).toBe(1);
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
