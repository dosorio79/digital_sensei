import {
  Award,
  BookOpenText,
  CircleHelp,
  Dumbbell,
  Hash,
  Languages,
  RotateCcw,
  Sparkles,
  Trophy
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type Category,
  type ContentCatalog,
  type PracticeQuestion,
  type ProgressSummary,
  type VisualCue,
  fetchContent,
  fetchPractice,
  fetchProgress,
  recordAttempt
} from "./api";

type Mode = "treinar_agora" | "palavras" | "numeros" | "tipos" | "review" | "progresso";

const MODES: Array<{ id: Mode; label: string; icon: typeof Dumbbell }> = [
  { id: "treinar_agora", label: "Treinar agora", icon: Dumbbell },
  { id: "palavras", label: "Palavras japonesas", icon: Languages },
  { id: "numeros", label: "Números", icon: Hash },
  { id: "tipos", label: "Técnicas do Judo", icon: CircleHelp },
  { id: "review", label: "Rever erros", icon: RotateCcw },
  { id: "progresso", label: "Progresso", icon: Trophy }
];

const CATEGORY_LABELS: Record<Category, string> = {
  vocabulario: "Vocabulário",
  numeros: "Números",
  nage_waza: "Projeção",
  ne_waza: "Solo",
  sequencias: "Sequência",
  viradas: "Virada"
};

function categoryClass(category: Category): string {
  return `tag ${category}`;
}

function questionTag(question: PracticeQuestion, selected: string | null): { label: string; className: string } {
  if (question.kind === "category" && !selected) {
    return { label: "Grupo do judo", className: "tag neutral" };
  }
  return { label: CATEGORY_LABELS[question.category], className: categoryClass(question.category) };
}

export function App() {
  const [mode, setMode] = useState<Mode>("treinar_agora");
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [catalog, setCatalog] = useState<ContentCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questions[questionIndex];
  const sessionDone = questions.length > 0 && questionIndex >= questions.length;

  useEffect(() => {
    fetchContent().then(setCatalog).catch(() => undefined);
  }, []);

  useEffect(() => {
    let ignore = false;
    setError(null);
    setSelected(null);

    if (mode === "progresso") {
      setLoading(true);
      fetchProgress()
        .then((data) => {
          if (!ignore) setProgress(data);
        })
        .catch(() => {
          if (!ignore) setError("Não consegui carregar o progresso.");
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
      return () => {
        ignore = true;
      };
    }

    setLoading(true);
    setQuestionIndex(0);
    setCorrectCount(0);
    fetchPractice(mode)
      .then((data) => {
        if (!ignore) setQuestions(data);
      })
      .catch(() => {
        if (!ignore) setError("Não consegui carregar o treino.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [mode]);

  const manualCount = catalog?.items.length ?? 0;
  const progressPercent = useMemo(() => {
    if (!questions.length || sessionDone) return 100;
    return Math.round((questionIndex / questions.length) * 100);
  }, [questionIndex, questions.length, sessionDone]);

  async function chooseAnswer(answer: string) {
    if (!currentQuestion || selected) return;
    setSelected(answer);
    if (answer === currentQuestion.correct_answer) {
      setCorrectCount((value) => value + 1);
    }
    try {
      await recordAttempt(currentQuestion, answer);
    } catch {
      setError("Resposta guardada só neste ecrã. O progresso pode não ter sido atualizado.");
    }
  }

  function nextQuestion() {
    setSelected(null);
    setQuestionIndex((value) => value + 1);
  }

  return (
    <main className="app-shell">
      <section className="practice-panel" aria-label="Treino Digital Sensei">
        <header className="topbar">
          <div>
            <p className="eyebrow">Digital Sensei</p>
            <h1>Graduação amarelo-laranja</h1>
          </div>
          <div className="manual-pill">
            <BookOpenText size={18} aria-hidden="true" />
            <span>{manualCount || "--"} itens do manual</span>
          </div>
        </header>

        <nav className="mode-tabs" aria-label="Modos de treino">
          {MODES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={mode === item.id ? "active" : ""}
                onClick={() => setMode(item.id)}
                title={item.label}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {error ? <p className="notice">{error}</p> : null}

        {mode === "progresso" ? (
          <ProgressView loading={loading} progress={progress} />
        ) : (
          <QuizView
            loading={loading}
            questions={questions}
            currentQuestion={currentQuestion}
            questionIndex={questionIndex}
            selected={selected}
            sessionDone={sessionDone}
            correctCount={correctCount}
            progressPercent={progressPercent}
            onChoose={chooseAnswer}
            onNext={nextQuestion}
            onRestart={() => setMode("treinar_agora")}
          />
        )}
      </section>
    </main>
  );
}

function QuizView({
  loading,
  questions,
  currentQuestion,
  questionIndex,
  selected,
  sessionDone,
  correctCount,
  progressPercent,
  onChoose,
  onNext,
  onRestart
}: {
  loading: boolean;
  questions: PracticeQuestion[];
  currentQuestion?: PracticeQuestion;
  questionIndex: number;
  selected: string | null;
  sessionDone: boolean;
  correctCount: number;
  progressPercent: number;
  onChoose: (answer: string) => void;
  onNext: () => void;
  onRestart: () => void;
}) {
  if (loading) {
    return <div className="center-state">A preparar o treino...</div>;
  }

  if (sessionDone) {
    const allCorrect = correctCount === questions.length;
    return (
      <section className="done-state">
        <Award size={54} aria-hidden="true" />
        <h2>{allCorrect ? "Treino limpo!" : "Treino terminado!"}</h2>
        <p>
          Acertaste {correctCount} de {questions.length}.
        </p>
        <button className="primary-action" onClick={onRestart}>
          <Sparkles size={20} aria-hidden="true" />
          Novo treino
        </button>
      </section>
    );
  }

  if (!currentQuestion) {
    return <div className="center-state">Ainda não há perguntas.</div>;
  }

  const answeredCorrectly = selected === currentQuestion.correct_answer;
  const tag = questionTag(currentQuestion, selected);

  return (
    <section className="quiz-card">
      <div className="quiz-meta">
        <span className={tag.className}>{tag.label}</span>
        <span>
          {questionIndex + 1} / {questions.length}
        </span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div style={{ width: `${progressPercent}%` }} />
      </div>
      <h2>{currentQuestion.prompt}</h2>
      <div className="answers">
        {currentQuestion.options.map((option) => {
          const isCorrect = option === currentQuestion.correct_answer;
          const isSelected = option === selected;
          let className = "answer-button";
          if (selected && isCorrect) className += " correct";
          if (selected && isSelected && !isCorrect) className += " wrong";

          return (
            <button
              key={option}
              className={className}
              disabled={Boolean(selected)}
              onClick={() => onChoose(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
      {selected ? (
        <div className={answeredCorrectly ? "feedback good" : "feedback retry"}>
          <strong>{answeredCorrectly ? "Boa!" : "Quase."}</strong>
          <span>
            {currentQuestion.child_explanation}
            {currentQuestion.media_sources.length ? (
              <a href={currentQuestion.media_sources[0].url} target="_blank" rel="noreferrer">
                Ver referência
              </a>
            ) : null}
          </span>
          {currentQuestion.visual_cue ? (
            <VisualCueCard cue={currentQuestion.visual_cue} category={currentQuestion.category} />
          ) : null}
          <button onClick={onNext}>{questionIndex + 1 === questions.length ? "Terminar" : "Próxima"}</button>
        </div>
      ) : null}
    </section>
  );
}

function VisualCueCard({ cue, category }: { cue: VisualCue; category: Category }) {
  return (
    <aside className={`visual-cue ${category}`} aria-label={`Pista visual: ${cue.label}`}>
      <div className="cue-figure" aria-hidden="true">
        <span className="judoca judoca-a" />
        <span className="motion-line line-one" />
        <span className="motion-line line-two" />
        <span className="judoca judoca-b" />
        <span className="mat-line" />
      </div>
      <div className="cue-copy">
        <strong>{cue.label}</strong>
        <span>{cue.action}</span>
        <ul>
          {cue.hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function ProgressView({ loading, progress }: { loading: boolean; progress: ProgressSummary | null }) {
  if (loading) {
    return <div className="center-state">A ver o progresso...</div>;
  }

  if (!progress) {
    return <div className="center-state">Ainda não há progresso para mostrar.</div>;
  }

  return (
    <section className="progress-view">
      <div className="score-grid">
        <Metric label="Respostas" value={progress.total_attempts} />
        <Metric label="Certas" value={progress.correct_attempts} />
        <Metric label="A rever" value={progress.incorrect_attempts} />
        <Metric label="Precisão" value={`${Math.round(progress.accuracy * 100)}%`} />
      </div>
      <div className="review-list">
        <h2>Temas para repetir</h2>
        {progress.weak_topics.length ? (
          progress.weak_topics.map((topic) => (
            <article key={topic.item_id}>
              <span className={categoryClass(topic.category)}>{CATEGORY_LABELS[topic.category]}</span>
              <h3>{topic.japanese}</h3>
              <p>{topic.portuguese}</p>
            </article>
          ))
        ) : (
          <p className="quiet">Ainda não há erros guardados.</p>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
