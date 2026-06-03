import { vi } from "vitest";

type MockVoice = Partial<SpeechSynthesisVoice> & Pick<SpeechSynthesisVoice, "lang" | "name">;

type SpeechMockOptions = {
  voices?: MockVoice[];
};

export class MockSpeechSynthesisUtterance {
  text: string;
  lang = "";
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: ((event: SpeechSynthesisEvent) => void) | null = null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

  constructor(text = "") {
    this.text = text;
  }
}

const defaultVoices: SpeechSynthesisVoice[] = [
  {
    default: true,
    lang: "pt-PT",
    localService: true,
    name: "Portuguese Portugal",
    voiceURI: "pt-PT"
  } as SpeechSynthesisVoice
];

let utterances: MockSpeechSynthesisUtterance[] = [];
let cancelCalls = 0;
let speechListeners: Record<string, EventListener[]> = {};

function normalizeVoices(voices: MockVoice[] | undefined): SpeechSynthesisVoice[] {
  return (voices ?? defaultVoices).map(
    (voice) =>
      ({
        default: voice.default ?? false,
        lang: voice.lang,
        localService: voice.localService ?? true,
        name: voice.name,
        voiceURI: voice.voiceURI ?? voice.name
      }) as SpeechSynthesisVoice
  );
}

export function installSpeechSynthesisMock(options: SpeechMockOptions = {}) {
  const voices = normalizeVoices(options.voices);
  utterances = [];
  cancelCalls = 0;
  speechListeners = {};

  const speechSynthesis = {
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      speechListeners[type] = [...(speechListeners[type] ?? []), listener];
    }),
    cancel: vi.fn(() => {
      cancelCalls += 1;
    }),
    getVoices: vi.fn(() => voices),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      speechListeners[type] = (speechListeners[type] ?? []).filter((item) => item !== listener);
    }),
    speak: vi.fn((utterance: MockSpeechSynthesisUtterance) => {
      utterances.push(utterance);
    })
  };

  vi.stubGlobal("SpeechSynthesisUtterance", MockSpeechSynthesisUtterance);
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: speechSynthesis
  });

  return speechSynthesis;
}

export function removeSpeechSynthesisMock() {
  Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
  Reflect.deleteProperty(window, "speechSynthesis");
}

export function getSpeechUtterances(): MockSpeechSynthesisUtterance[] {
  return utterances;
}

export function getSpeechCancelCalls(): number {
  return cancelCalls;
}

export function finishCurrentUtterance() {
  const utterance = utterances[utterances.length - 1];
  utterance?.onend?.({} as SpeechSynthesisEvent);
}

type ScheduledNote = {
  frequency: number;
  startTime: number;
  stopTime: number;
};

let audioContexts: MockAudioContext[] = [];

class MockAudioParam {
  value = 0;

  setValueAtTime = vi.fn((value: number) => {
    this.value = value;
  });

  exponentialRampToValueAtTime = vi.fn((value: number) => {
    this.value = value;
  });
}

class MockOscillator {
  frequency = new MockAudioParam();
  type: OscillatorType = "sine";
  startedAt: number | null = null;
  stoppedAt: number | null = null;

  constructor(private readonly context: MockAudioContext) {}

  connect = vi.fn();
  start = vi.fn((startTime: number) => {
    this.startedAt = startTime;
  });
  stop = vi.fn((stopTime: number) => {
    this.stoppedAt = stopTime;
    this.context.notes.push({
      frequency: this.frequency.value,
      startTime: this.startedAt ?? 0,
      stopTime
    });
  });
}

class MockGain {
  gain = new MockAudioParam();
  connect = vi.fn();
}

export class MockAudioContext {
  currentTime = 10;
  destination = {};
  notes: ScheduledNote[] = [];
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
  createOscillator = vi.fn(() => new MockOscillator(this));
  createGain = vi.fn(() => new MockGain());
}

export function installAudioContextMock() {
  audioContexts = [];
  function AudioContextMock() {
    const context = new MockAudioContext();
    audioContexts.push(context);
    return context;
  }
  const AudioContextMockFn = vi.fn(AudioContextMock);

  vi.stubGlobal("AudioContext", AudioContextMockFn);
  return AudioContextMockFn;
}

export function removeAudioContextMock() {
  Reflect.deleteProperty(window, "AudioContext");
  Reflect.deleteProperty(window, "webkitAudioContext");
}

export function getAudioContexts(): MockAudioContext[] {
  return audioContexts;
}
