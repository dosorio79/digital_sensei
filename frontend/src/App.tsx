import {
  Award,
  CircleHelp,
  ClipboardCheck,
  Dumbbell,
  Hash,
  Languages,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type Category,
  type ContentCatalog,
  type ContentItem,
  type PracticeQuestion,
  type ProgressSummary,
  type UserId,
  type VisualCue,
  fetchContent,
  fetchPractice,
  fetchProgress,
  recordAttempt,
  resetProgress
} from "./api";

type Mode = "treinar_agora" | "palavras" | "numeros" | "tipos" | "demos" | "review" | "progresso";

const MODES: Array<{ id: Mode; label: string; icon: typeof Dumbbell }> = [
  { id: "treinar_agora", label: "Treinar agora", icon: Dumbbell },
  { id: "palavras", label: "Palavras japonesas", icon: Languages },
  { id: "numeros", label: "Números", icon: Hash },
  { id: "tipos", label: "Técnicas do Judo", icon: CircleHelp },
  { id: "demos", label: "Demonstrações", icon: ClipboardCheck },
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

function storedUser(): UserId {
  return localStorage.getItem("ds_user") === "crianca" ? "crianca" : "adulto";
}

export function App() {
  const [userId, setUserId] = useState<UserId>(storedUser);
  const [mode, setMode] = useState<Mode>("treinar_agora");
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [catalog, setCatalog] = useState<ContentCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const currentQuestion = questions[questionIndex];
  const sessionDone = questions.length > 0 && questionIndex >= questions.length;

  function switchUser(next: UserId) {
    localStorage.setItem("ds_user", next);
    setUserId(next);
    setSessionKey((value) => value + 1);
    setMode("treinar_agora");
    setProgress(null);
    setSelected(null);
  }

  function restartPractice() {
    setSessionKey((value) => value + 1);
    setMode("treinar_agora");
  }

  useEffect(() => {
    let ignore = false;
    setError(null);
    setSelected(null);

    if (mode === "progresso") {
      setLoading(true);
      fetchProgress(userId)
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

    if (mode === "demos") {
      setLoading(true);
      fetchContent()
        .then((data) => {
          if (!ignore) setCatalog(data);
        })
        .catch(() => {
          if (!ignore) setError("Não consegui carregar as demonstrações.");
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
    fetchPractice(mode, userId)
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
  }, [mode, userId, sessionKey]);

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
      await recordAttempt(currentQuestion, answer, userId);
    } catch {
      setError("Resposta guardada só neste ecrã. O progresso pode não ter sido atualizado.");
    }
  }

  function nextQuestion() {
    setSelected(null);
    setQuestionIndex((value) => value + 1);
  }

  async function handleReset() {
    if (!confirm(`Apagar todo o progresso de ${userId === "adulto" ? "Adulto" : "Criança"}?`)) return;
    setResetting(true);
    try {
      await resetProgress(userId);
      setProgress(null);
      setMode("treinar_agora");
    } catch {
      setError("Não consegui apagar o progresso.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="practice-panel" aria-label="Treino Digital Sensei">
        <header className="topbar">
          <div>
            <p className="eyebrow">Digital Sensei</p>
            <h1>Graduação amarelo-laranja</h1>
          </div>
          <div className="user-switcher">
            <UserRound size={16} aria-hidden="true" />
            <button
              className={userId === "adulto" ? "active" : ""}
              onClick={() => switchUser("adulto")}
            >
              Adulto
            </button>
            <button
              className={userId === "crianca" ? "active" : ""}
              onClick={() => switchUser("crianca")}
            >
              Criança
            </button>
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
          <ProgressView
            loading={loading}
            progress={progress}
            onReset={handleReset}
            resetting={resetting}
          />
        ) : mode === "demos" ? (
          <DemosView loading={loading} catalog={catalog} />
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
            onRestart={restartPractice}
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

// ── SVG illustration constants ────────────────────────────────────────────────
const IC_D = "#24352e";   // dark
const IC_O = "#d97706";   // orange
const IC_F = "#fffdf7";   // light fill
const IC_SW = 2.5;        // stroke width

/** Standing judoka. cx = horizontal centre, fy = foot y (default 108). */
function JudokaFigure({
  cx, fy = 108, angle = 0, ax, ay,
}: { cx: number; fy?: number; angle?: number; ax?: number; ay?: number }) {
  const el = (
    <>
      <circle cx={cx} cy={fy - 63} r={9} fill={IC_F} stroke={IC_D} strokeWidth={IC_SW} />
      <line x1={cx} y1={fy - 54} x2={cx} y2={fy - 32} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
      <line x1={cx - 15} y1={fy - 43} x2={cx + 15} y2={fy - 43} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
      <line x1={cx} y1={fy - 32} x2={cx - 11} y2={fy} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
      <line x1={cx} y1={fy - 32} x2={cx + 11} y2={fy} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
    </>
  );
  return angle !== 0
    ? <g transform={`rotate(${angle}, ${ax ?? cx}, ${ay ?? fy - 32})`}>{el}</g>
    : <>{el}</>;
}

/** Renders a pose-specific SVG scene (viewBox 0 0 180 120). */
function TechniqueIllustration({ pose, category }: { pose?: string; category: Category }) {
  const p = pose ?? category;
  return (
    <svg viewBox="0 0 180 120" width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      {/* mat line */}
      <line x1={12} y1={108} x2={168} y2={108} stroke={IC_D} strokeWidth={3} strokeLinecap="round" />
      {p === "sweep_out" && (
        <>
          <JudokaFigure cx={52} />
          {/* sweeping leg - outside */}
          <line x1={52} y1={76} x2={96} y2={108} stroke={IC_O} strokeWidth={4} strokeLinecap="round" />
          <JudokaFigure cx={125} angle={22} ax={125} ay={76} />
        </>
      )}
      {p === "sweep_in" && (
        <>
          <JudokaFigure cx={55} />
          {/* sweeping leg - inside (shorter, crossing inward) */}
          <line x1={55} y1={76} x2={84} y2={92} stroke={IC_O} strokeWidth={4} strokeLinecap="round" />
          <JudokaFigure cx={120} angle={18} ax={120} ay={76} />
        </>
      )}
      {p === "foot_block" && (
        <>
          <JudokaFigure cx={50} />
          {/* blocking foot extended forward to mat */}
          <line x1={50} y1={76} x2={95} y2={108} stroke={IC_O} strokeWidth={4} strokeLinecap="round" />
          {/* vertical stop indicator */}
          <line x1={95} y1={82} x2={95} y2={108} stroke={IC_O} strokeWidth={2} strokeLinecap="round" strokeDasharray="4 3" />
          {/* uke leaning forward */}
          <JudokaFigure cx={126} angle={-22} ax={126} ay={76} />
        </>
      )}
      {p === "shoulder_throw" && (
        <>
          {/* tori in entry: head low, bent, back to uke */}
          <circle cx={72} cy={65} r={9} fill={IC_F} stroke={IC_D} strokeWidth={IC_SW} />
          <line x1={72} y1={74} x2={82} y2={86} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={66} y1={80} x2={56} y2={68} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={82} y1={79} x2={108} y2={70} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={82} y1={86} x2={73} y2={108} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={82} y1={86} x2={92} y2={108} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          {/* uke going over shoulder */}
          <JudokaFigure cx={128} fy={92} angle={-62} ax={108} ay={70} />
          {/* rotation arc */}
          <path d="M 108 70 Q 122 44 130 60" stroke={IC_O} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <polygon points="130,60 122,56 125,65" fill={IC_O} />
        </>
      )}
      {p === "hip_throw" && (
        <>
          <JudokaFigure cx={62} />
          {/* hip contact indicator */}
          <ellipse cx={78} cy={76} rx={9} ry={5} fill={IC_O} opacity={0.75} />
          {/* uke going over hip */}
          <JudokaFigure cx={122} fy={92} angle={-48} ax={78} ay={76} />
          {/* rotation arc */}
          <path d="M 78 66 Q 108 40 124 58" stroke={IC_O} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <polygon points="124,58 115,56 118,65" fill={IC_O} />
        </>
      )}
      {p === "kesa_gatame" && (
        <>
          {/* uke flat: head left */}
          <circle cx={55} cy={92} r={9} fill={IC_F} stroke={IC_D} strokeWidth={IC_SW} />
          <line x1={64} y1={92} x2={158} y2={92} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={100} y1={82} x2={100} y2={102} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          {/* tori sitting beside uke's head/shoulder */}
          <circle cx={76} cy={52} r={9} fill={IC_F} stroke={IC_D} strokeWidth={IC_SW} />
          <line x1={76} y1={61} x2={76} y2={78} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={76} y1={68} x2={55} y2={90} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={76} y1={68} x2={96} y2={88} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={76} y1={78} x2={58} y2={104} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={76} y1={78} x2={94} y2={104} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          {/* control point */}
          <circle cx={55} cy={90} r={5} fill={IC_O} opacity={0.85} />
        </>
      )}
      {p === "yoko_shiho" && (
        <>
          {/* uke flat: head left */}
          <circle cx={28} cy={88} r={9} fill={IC_F} stroke={IC_D} strokeWidth={IC_SW} />
          <line x1={37} y1={88} x2={152} y2={88} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={80} y1={79} x2={80} y2={97} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          {/* tori perpendicular (vertical, on uke's side) */}
          <circle cx={90} cy={40} r={9} fill={IC_F} stroke={IC_D} strokeWidth={IC_SW} />
          <line x1={90} y1={49} x2={90} y2={70} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={90} y1={59} x2={42} y2={83} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={90} y1={59} x2={136} y2={83} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={90} y1={70} x2={68} y2={90} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={90} y1={70} x2={112} y2={90} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          {/* control points both sides */}
          <circle cx={42} cy={83} r={4} fill={IC_O} opacity={0.85} />
          <circle cx={136} cy={83} r={4} fill={IC_O} opacity={0.85} />
        </>
      )}
      {p === "kami_shiho" && (
        <>
          {/* uke flat: head right */}
          <circle cx={148} cy={90} r={9} fill={IC_F} stroke={IC_D} strokeWidth={IC_SW} />
          <line x1={139} y1={90} x2={28} y2={90} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={90} y1={81} x2={90} y2={99} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          {/* tori above uke's head */}
          <circle cx={148} cy={36} r={9} fill={IC_F} stroke={IC_D} strokeWidth={IC_SW} />
          <line x1={148} y1={45} x2={148} y2={66} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={148} y1={55} x2={140} y2={83} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={148} y1={55} x2={156} y2={83} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={148} y1={66} x2={132} y2={96} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={148} y1={66} x2={164} y2={96} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          {/* control on uke's head */}
          <circle cx={148} cy={83} r={5} fill={IC_O} opacity={0.85} />
        </>
      )}
      {p === "tate_shiho" && (
        <>
          {/* uke flat: head left */}
          <circle cx={30} cy={92} r={9} fill={IC_F} stroke={IC_D} strokeWidth={IC_SW} />
          <line x1={39} y1={92} x2={152} y2={92} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={92} y1={83} x2={92} y2={101} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          {/* tori mounted: head up, knees wide to mat */}
          <circle cx={90} cy={35} r={9} fill={IC_F} stroke={IC_D} strokeWidth={IC_SW} />
          <line x1={90} y1={44} x2={90} y2={65} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={75} y1={53} x2={105} y2={53} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={90} y1={65} x2={58} y2={92} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={90} y1={65} x2={122} y2={92} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          {/* knee contact dots */}
          <circle cx={58} cy={92} r={5} fill={IC_O} opacity={0.85} />
          <circle cx={122} cy={92} r={5} fill={IC_O} opacity={0.85} />
        </>
      )}
      {p === "turnover" && (
        <>
          {/* uke prone: head left */}
          <circle cx={40} cy={90} r={9} fill={IC_F} stroke={IC_D} strokeWidth={IC_SW} />
          <line x1={49} y1={90} x2={148} y2={90} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={88} y1={82} x2={88} y2={98} stroke={IC_D} strokeWidth={IC_SW} strokeLinecap="round" />
          {/* X = face-down indicator */}
          <line x1={130} y1={83} x2={142} y2={97} stroke={IC_O} strokeWidth={2} strokeLinecap="round" />
          <line x1={142} y1={83} x2={130} y2={97} stroke={IC_O} strokeWidth={2} strokeLinecap="round" />
          {/* tori kneeling beside */}
          <JudokaFigure cx={155} />
          {/* rotation arrow */}
          <path d="M 100 80 Q 92 62 80 74" stroke={IC_O} strokeWidth={3} fill="none" strokeLinecap="round" />
          <polygon points="80,74 86,65 88,75" fill={IC_O} />
        </>
      )}
      {p === "chain" && (
        <>
          <JudokaFigure cx={32} />
          <line x1={54} y1={75} x2={74} y2={75} stroke={IC_O} strokeWidth={3} strokeLinecap="round" />
          <polygon points="74,75 66,70 66,80" fill={IC_O} />
          <JudokaFigure cx={96} />
          <line x1={118} y1={75} x2={138} y2={75} stroke={IC_O} strokeWidth={3} strokeLinecap="round" />
          <polygon points="138,75 130,70 130,80" fill={IC_O} />
          {/* ghost third figure */}
          <circle cx={160} cy={45} r={9} fill={IC_F} stroke="#9ab8b0" strokeWidth={IC_SW} />
          <line x1={160} y1={54} x2={160} y2={76} stroke="#9ab8b0" strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={145} y1={64} x2={175} y2={64} stroke="#9ab8b0" strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={160} y1={76} x2={149} y2={108} stroke="#9ab8b0" strokeWidth={IC_SW} strokeLinecap="round" />
          <line x1={160} y1={76} x2={171} y2={108} stroke="#9ab8b0" strokeWidth={IC_SW} strokeLinecap="round" />
        </>
      )}
      {p === "counter" && (
        <>
          <JudokaFigure cx={38} />
          {/* attack arrow right */}
          <line x1={60} y1={66} x2={88} y2={66} stroke={IC_D} strokeWidth={2.5} strokeLinecap="round" />
          <polygon points="88,66 80,61 80,71" fill={IC_D} />
          <JudokaFigure cx={140} />
          {/* counter arc back left */}
          <path d="M 88 78 Q 90 100 60 78" stroke={IC_O} strokeWidth={3} fill="none" strokeLinecap="round" />
          <polygon points="60,78 68,73 67,83" fill={IC_O} />
        </>
      )}
      {!["sweep_out","sweep_in","foot_block","shoulder_throw","hip_throw",
         "kesa_gatame","yoko_shiho","kami_shiho","tate_shiho",
         "turnover","chain","counter"].includes(p) && (
        <>
          <JudokaFigure cx={52} />
          <JudokaFigure cx={128} />
          <line x1={68} y1={64} x2={112} y2={64} stroke={IC_O} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="6 3" />
        </>
      )}
    </svg>
  );
}

function VisualCueCard({ cue, category }: { cue: VisualCue; category: Category }) {
  return (
    <aside className={`visual-cue ${category}`} aria-label={`Pista visual: ${cue.label}`}>
      <div className="cue-figure">
        <TechniqueIllustration pose={cue.pose} category={category} />
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

function demoRequirement(item: ContentItem): string {
  if (item.id === "seq-ren-raku-waza") return "Demonstrar 2 sequências";
  if (item.id === "seq-kaeshi-waza") return "Demonstrar 1 contra-ataque";
  if (item.id === "viradas-decubito-ventral") return "Demonstrar 3 viradas";
  return item.manual_text;
}

function DemosView({ loading, catalog }: { loading: boolean; catalog: ContentCatalog | null }) {
  if (loading) {
    return <div className="center-state">A preparar as demonstrações...</div>;
  }

  const items = catalog?.items.filter((item) => item.manual_text.includes("Demonstrar")) ?? [];
  if (!items.length) {
    return <div className="center-state">Ainda não há demonstrações para mostrar.</div>;
  }

  return (
    <section className="demos-view">
      {items.map((item) => (
        <article key={item.id} className="demo-card">
          <div className="demo-copy">
            <span className={categoryClass(item.category)}>{CATEGORY_LABELS[item.category]}</span>
            <h2>{item.japanese}</h2>
            <strong>{demoRequirement(item)}</strong>
            <p>{item.child_explanation}</p>
            {item.media_sources.length ? (
              <a href={item.media_sources[0].url} target="_blank" rel="noreferrer">
                Ver referência
              </a>
            ) : null}
          </div>
          {item.visual_cue ? <VisualCueCard cue={item.visual_cue} category={item.category} /> : null}
        </article>
      ))}
    </section>
  );
}

function ProgressView({
  loading, progress, onReset, resetting,
}: {
  loading: boolean;
  progress: ProgressSummary | null;
  onReset: () => void;
  resetting: boolean;
}) {
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
      <button className="reset-btn" onClick={onReset} disabled={resetting}>
        <Trash2 size={16} aria-hidden="true" />
        {resetting ? "A apagar..." : "Apagar progresso"}
      </button>
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
