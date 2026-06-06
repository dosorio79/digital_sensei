import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { ContentCatalog, PracticeQuestion } from "./api";
import {
  finishCurrentUtterance,
  getAudioContexts,
  getSpeechCancelCalls,
  getSpeechUtterances,
  installSpeechSynthesisMock
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

const glossaryCatalog: ContentCatalog = {
  source_manual: "manuals/MANUAL AMARELO LARANJA.pdf",
  language: "pt-PT",
  items: [
    {
      id: "vocab-sensei",
      category: "vocabulario",
      japanese: "Sensei",
      portuguese: "Professor",
      manual_text: "Sensei = Professor",
      child_explanation: "Sensei é o professor.",
      quiz_prompts: ["O que quer dizer Sensei?"],
      accepted_answers: ["Professor"],
      media_sources: [],
      visual_cue: null
    },
    {
      id: "nage-o-soto-gari",
      category: "nage_waza",
      japanese: "O soto gari",
      portuguese: "Técnica de perna",
      manual_text: "Ashi Waza (Técnicas de perna) - O soto Gari",
      child_explanation: "O soto gari é uma técnica de perna com varrimento por fora e controlo.",
      quiz_prompts: ["O soto gari pertence a que grupo?"],
      accepted_answers: ["Técnica de perna", "Ashi Waza"],
      media_sources: [
        {
          copyright_caution: "link only",
          media_type: "official technique page",
          provider: "International Judo Federation",
          title: "IJF Judo Techniques: O-soto-gari",
          url: "https://judo.ijf.org/techniques/O-soto-gari"
        }
      ],
      visual_cue: {
        action: "Varre por fora",
        hints: ["Fica alto e equilibrado"],
        label: "Perna por fora",
        pose: "sweep_out"
      }
    },
    {
      id: "ne-kesa-gatame",
      category: "ne_waza",
      japanese: "Kesa Gatame",
      portuguese: "Técnica de imobilização",
      manual_text: "Osae Waza (Técnicas de imobilização) - Kesa Gatame",
      child_explanation: "Kesa Gatame é uma imobilização de solo com controlo estável.",
      quiz_prompts: ["Kesa Gatame é uma técnica de quê?"],
      accepted_answers: ["Técnica de imobilização", "Osae Waza"],
      media_sources: [],
      visual_cue: {
        action: "Controla no chão",
        hints: ["Peito perto"],
        label: "Imobilização lateral",
        pose: "kesa_gatame"
      }
    }
  ]
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
    if (url === "/api/content") return jsonResponse(glossaryCatalog);
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

    expect(getSpeechUtterances().map((utterance) => utterance.text)).toEqual(["Ô soto gari pertence a que grupo?"]);

    act(() => finishCurrentUtterance());

    await waitFor(() => expect(screen.getByRole("button", { name: "Perna" })).toHaveClass("reading"));
    expect(getSpeechUtterances().map((utterance) => utterance.text)).toEqual(["Ô soto gari pertence a que grupo?", "Perna"]);

    act(() => finishCurrentUtterance());

    await waitFor(() => expect(screen.getByRole("button", { name: "Braço" })).toHaveClass("reading"));
  });

  it("plays a chime and auto-reads feedback after a correct answer", async () => {
    const user = userEvent.setup();
    await renderQuiz();

    await user.click(screen.getByRole("button", { name: "Perna" }));

    expect(getAudioContexts()[0].notes.map((note) => note.frequency)).toEqual([523.25, 659.25]);
    expect(getSpeechUtterances()[0].text).toContain("Boa! Ô soto gari pertence");
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

  it("renders a glossary of manual technique cards from content", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Glossário" }));

    expect(await screen.findByRole("heading", { name: "Projeção" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Solo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "O soto gari" })).toBeInTheDocument();
    expect(screen.queryByText("Ashi Waza (Técnicas de perna) - O soto Gari")).not.toBeInTheDocument();
    expect(screen.getByText("O soto gari é uma técnica de perna com varrimento por fora e controlo.")).toBeInTheDocument();
    expect(screen.getByText("Perna por fora")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ouvir O soto gari" }));
    expect(getSpeechUtterances()[0].text).toBe("Ô soto gari");
    act(() => finishCurrentUtterance());
    expect(getSpeechUtterances()[1].text).toBe("Técnica de perna");
    expect(screen.getByRole("link", { name: "Ver referência" })).toHaveAttribute(
      "href",
      "https://judo.ijf.org/techniques/O-soto-gari"
    );
    expect(screen.queryByRole("heading", { name: "Sensei" })).not.toBeInTheDocument();
  });

  it("lets the learner choose and test an available Portuguese voice", async () => {
    installSpeechSynthesisMock({
      voices: [
        { lang: "pt-PT", name: "Portuguese Portugal", voiceURI: "basic-pt-PT" },
        { lang: "pt-BR", name: "Portuguese Brazil", voiceURI: "pt-BR" }
      ]
    });
    const user = userEvent.setup();
    await renderQuiz();

    await user.selectOptions(screen.getByLabelText("Escolher voz de leitura"), "pt-BR");
    await user.click(screen.getByRole("button", { name: "Testar voz" }));

    expect(localStorage.getItem("ds_speech_voice_uri")).toBe("pt-BR");
    expect(getSpeechUtterances()[0].voice?.voiceURI).toBe("pt-BR");
    expect(getSpeechUtterances()[0].text).toBe("Olá. Vamos treinar judo com Ô soto gari.");
  });
});
