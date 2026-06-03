import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { PracticeQuestion } from "./api";
import {
  finishCurrentUtterance,
  getAudioContexts,
  getSpeechCancelCalls,
  getSpeechUtterances
} from "./test/audioMocks";

const firstQuestion: PracticeQuestion = {
  id: "treinar_agora-ashi-waza",
  item_id: "ashi-waza",
  kind: "category",
  prompt: "O soto gari pertence a que grupo?",
  options: ["Perna", "Braço", "Quadril", "Solo"],
  correct_answer: "Perna",
  child_explanation: "O soto gari pertence às técnicas de perna, chamadas Ashi Waza.",
  category: "nage_waza",
  media_sources: [
    {
      copyright_caution: "link only",
      media_type: "video",
      provider: "Example",
      title: "O soto gari",
      url: "https://example.test/o-soto-gari"
    }
  ],
  visual_cue: {
    action: "Varre por fora",
    hints: ["Fica alto e equilibrado", "A perna trabalha por fora"],
    label: "Perna por fora",
    pose: "sweep_out"
  }
};

const secondQuestion: PracticeQuestion = {
  ...firstQuestion,
  id: "treinar_agora-kesa",
  item_id: "kesa",
  prompt: "Kesa gatame é uma técnica de quê?",
  options: ["Imobilização", "Número", "Saudação", "Queda"],
  correct_answer: "Imobilização",
  child_explanation: "Kesa gatame é uma imobilização no chão.",
  media_sources: [],
  visual_cue: null
};

function jsonResponse(data: unknown): Response {
  return {
    json: async () => data,
    ok: true,
    status: 200
  } as Response;
}

function mockApi(questions: PracticeQuestion[] = [firstQuestion]) {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith("/api/practice/today")) return jsonResponse(questions);
    if (url === "/api/attempts") return jsonResponse({});
    return jsonResponse({});
  });
}

async function renderQuiz(questions: PracticeQuestion[] = [firstQuestion]) {
  mockApi(questions);
  render(<App />);
  await screen.findByRole("heading", { name: questions[0].prompt });
}

describe("App audio behavior", () => {
  it("reads the question followed by answers and highlights the active answer", async () => {
    const user = userEvent.setup();
    await renderQuiz();

    await user.click(screen.getByRole("button", { name: "Ouvir pergunta e respostas" }));

    expect(getSpeechUtterances().map((utterance) => utterance.text)).toEqual([firstQuestion.prompt]);

    act(() => finishCurrentUtterance());

    await waitFor(() => expect(screen.getByRole("button", { name: "Perna" })).toHaveClass("reading"));
    expect(getSpeechUtterances().map((utterance) => utterance.text)).toEqual([firstQuestion.prompt, "Perna"]);

    act(() => finishCurrentUtterance());

    await waitFor(() => expect(screen.getByRole("button", { name: "Braço" })).toHaveClass("reading"));
  });

  it("plays a chime and auto-reads feedback after a correct answer", async () => {
    const user = userEvent.setup();
    await renderQuiz();

    await user.click(screen.getByRole("button", { name: "Perna" }));

    expect(getAudioContexts()[0].notes.map((note) => note.frequency)).toEqual([523.25, 659.25]);
    expect(getSpeechUtterances()[0].text).toContain("Boa! O soto gari pertence");
    expect(getSpeechUtterances()[0].text).toContain("Perna por fora. Varre por fora.");
    expect(screen.getByText("Resposta certa:")).toBeInTheDocument();
  });

  it("does not chime and auto-reads the correct answer after a wrong answer", async () => {
    const user = userEvent.setup();
    await renderQuiz();

    await user.click(screen.getByRole("button", { name: "Braço" }));

    expect(getAudioContexts()).toHaveLength(0);
    expect(getSpeechUtterances()[0].text).toContain("Quase. A resposta certa é Perna.");
    expect(screen.getByRole("button", { name: "Perna" })).toHaveClass("correct");
    expect(screen.getByRole("button", { name: "Braço" })).toHaveClass("wrong");
  });

  it("stops speech when advancing to the next question", async () => {
    const user = userEvent.setup();
    await renderQuiz([firstQuestion, secondQuestion]);

    await user.click(screen.getByRole("button", { name: "Perna" }));
    const cancelCallsAfterAnswer = getSpeechCancelCalls();
    await user.click(screen.getByRole("button", { name: "Próxima" }));

    expect(getSpeechCancelCalls()).toBeGreaterThan(cancelCallsAfterAnswer);
    expect(await screen.findByRole("heading", { name: secondQuestion.prompt })).toBeInTheDocument();
  });

  it("renders reference links as visible play actions", async () => {
    await renderQuiz();

    await userEvent.click(screen.getByRole("button", { name: "Perna" }));

    const reference = screen.getByRole("link", { name: "Ver referência" });
    expect(reference).toHaveClass("reference-link");
    expect(reference).toHaveAttribute("href", "https://example.test/o-soto-gari");
    expect(reference.querySelector("svg.lucide-circle-play")).toBeInTheDocument();
  });
});
