import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getAudioContexts, removeAudioContextMock } from "./test/audioMocks";
import { useSoundEffects } from "./useSoundEffects";

describe("useSoundEffects", () => {
  it("reports unavailable when Web Audio is missing", () => {
    removeAudioContextMock();

    const { result } = renderHook(() => useSoundEffects());

    expect(result.current.supported).toBe(false);
  });

  it("persists enabled state in localStorage", () => {
    const { result } = renderHook(() => useSoundEffects());

    act(() => result.current.setEnabled(false));

    expect(result.current.enabled).toBe(false);
    expect(localStorage.getItem("ds_sound_enabled")).toBe("false");
  });

  it("does not play when disabled", () => {
    const { result } = renderHook(() => useSoundEffects());

    act(() => result.current.setEnabled(false));
    act(() => result.current.playCorrect());

    expect(getAudioContexts()).toHaveLength(0);
  });

  it("schedules a short two-note correct-answer chime", () => {
    const { result } = renderHook(() => useSoundEffects());

    act(() => result.current.playCorrect());

    const context = getAudioContexts()[0];
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(context.createOscillator).toHaveBeenCalledTimes(2);
    expect(context.createGain).toHaveBeenCalledTimes(2);
    expect(context.notes.map((note) => note.frequency)).toEqual([523.25, 659.25]);
  });
});
