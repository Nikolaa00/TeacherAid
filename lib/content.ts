import raw from "@/content/opener.json";
import type { PublicQuestion, QuestionContent, SessionContent } from "./types";

export const content = raw as SessionContent;

export function getQuestion(index: number): QuestionContent | null {
  return content.questions[index] ?? null;
}

/** Strip the answer until it is time to show it. */
export function toPublicQuestion(q: QuestionContent, revealed: boolean): PublicQuestion {
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    reasonPrompt: q.reasonPrompt,
    correct: revealed ? q.correct : null,
    reveal: revealed ? q.reveal : null,
  };
}

export const sessionInfo = {
  app: content.app,
  subject: content.subject,
  className: content.className,
  school: content.school,
  topic: content.topic,
  generatedLabel: content.generatedLabel,
};
