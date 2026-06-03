import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { installAudioContextMock, installSpeechSynthesisMock } from "./audioMocks";

beforeEach(() => {
  localStorage.clear();
  installSpeechSynthesisMock();
  installAudioContextMock();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});
