export type Category = "vocabulario" | "numeros" | "nage_waza" | "ne_waza" | "sequencias" | "viradas";

export type PracticeQuestion = {
  id: string;
  item_id: string;
  kind: "japanese_to_portuguese" | "category";
  prompt: string;
  options: string[];
  correct_answer: string;
  child_explanation: string;
  category: Category;
  media_sources: MediaSource[];
  visual_cue: VisualCue | null;
};

export type ProgressSummary = {
  nickname: string;
  total_attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  accuracy: number;
  completed_sessions: number;
  weak_topics: Array<{
    item_id: string;
    japanese: string;
    portuguese: string;
    category: Category;
    incorrect: number;
    correct: number;
  }>;
};

export type ContentItem = {
  id: string;
  category: Category;
  japanese: string;
  portuguese: string;
  manual_text: string;
  child_explanation: string;
  quiz_prompts: string[];
  accepted_answers: string[];
  media_sources: MediaSource[];
  visual_cue: VisualCue | null;
};

export type MediaSource = {
  title: string;
  url: string;
  provider: string;
  media_type: string;
  copyright_caution: string;
};

export type VisualCue = {
  label: string;
  action: string;
  hints: string[];
  pose?: string;
};

export type ContentCatalog = {
  source_manual: string;
  language: string;
  items: ContentItem[];
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Pedido falhou: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchPractice(mode: string): Promise<PracticeQuestion[]> {
  return request<PracticeQuestion[]>(`/api/practice/today?mode=${mode}`);
}

export function fetchProgress(): Promise<ProgressSummary> {
  return request<ProgressSummary>("/api/progress");
}

export function fetchContent(): Promise<ContentCatalog> {
  return request<ContentCatalog>("/api/content");
}

export function recordAttempt(question: PracticeQuestion, selectedAnswer: string): Promise<unknown> {
  return request("/api/attempts", {
    method: "POST",
    body: JSON.stringify({
      question_id: question.id,
      item_id: question.item_id,
      selected_answer: selectedAnswer,
      correct: selectedAnswer === question.correct_answer,
      mode: question.id.split("-")[0] || "treinar_agora"
    })
  });
}
