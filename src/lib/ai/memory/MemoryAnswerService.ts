import { MemoryRetrievalServiceV2, type RetrievedMemoryV2, type RetrievalResultV2 } from "./MemoryRetrievalServiceV2";
import { MemoryUpdateService } from "./MemoryUpdateService";

export class MemoryAnswerService {
  private retrieval = new MemoryRetrievalServiceV2();
  private update = new MemoryUpdateService();

  async answerFromMemory(
    userId: string,
    queryText: string,
    ignoreMemory: boolean
  ): Promise<{ answer: string | null; memoryUsed: boolean; retrievalMode: string }> {
    if (ignoreMemory) {
      return { answer: null, memoryUsed: false, retrievalMode: "ignored" };
    }

    const result = await this.retrieval.retrieve(userId, queryText);

    if (!result.memoryUsed || result.profileFacts.length === 0) {
      return { answer: null, memoryUsed: false, retrievalMode: result.retrievalMode };
    }

    const fact = result.profileFacts[0];
    await this.update.touch(fact.id);

    const answer = this.buildAnswer(fact, queryText);
    return { answer, memoryUsed: true, retrievalMode: result.retrievalMode };
  }

  private buildAnswer(fact: RetrievedMemoryV2, queryText: string): string {
    const value = fact.value || fact.text;
    const isArabic = /[\u0600-\u06FF]/.test(queryText);

    switch (fact.memoryKey) {
      case "name":
        return isArabic ? `اسمك ${value}.` : `Your name is ${value}.`;
      case "age":
        return isArabic ? `عمرك ${value}.` : `You are ${value} years old.`;
      case "city":
        return isArabic ? `أنت ساكن في ${value}.` : `You live in ${value}.`;
      case "country":
        return isArabic ? `أنت من ${value}.` : `You are from ${value}.`;
      case "location":
        return isArabic ? `أنت ساكن في ${value}.` : `You live in ${value}.`;
      case "work":
      case "job":
        return isArabic ? `أنت تشتغل في ${value}.` : `You work as ${value}.`;
      case "education":
        return isArabic ? `أنت تدرس ${value}.` : `You study ${value}.`;
      case "interests":
        return isArabic ? `أنت تحب ${value}.` : `You like ${value}.`;
      case "goals":
      case "goal":
        return isArabic ? `هدفك ${value}.` : `Your goal is ${value}.`;
      case "preferences":
        return isArabic ? `أنت تفضل ${value}.` : `You prefer ${value}.`;
      case "tools":
        return isArabic ? `أنت تستخدم ${value}.` : `You use ${value}.`;
      case "projects":
        return isArabic ? `مشروعك ${value}.` : `Your project is ${value}.`;
      case "language":
        return isArabic ? `لغتك ${value}.` : `Your language is ${value}.`;
      default:
        return isArabic ? `المعلومة المحفوظة: ${value}.` : `Saved info: ${value}.`;
    }
  }

  buildUnknownAnswer(queryText: string, key?: string): string {
    const isArabic = /[\u0600-\u06FF]/.test(queryText);

    if (key === "name") return isArabic ? "ما أعرف اسمك حتى الآن." : "I don't know your name yet.";
    if (key === "age") return isArabic ? "ما أعرف عمرك حتى الآن." : "I don't know your age yet.";
    if (key === "city" || key === "location") return isArabic ? "ما أعرف وين ساكن." : "I don't know where you live yet.";
    if (key === "work" || key === "job") return isArabic ? "ما أعرف وش تشتغل." : "I don't know what you do yet.";
    if (key === "education") return isArabic ? "ما أعرف وش تدرس." : "I don't know what you study yet.";
    if (key === "interests") return isArabic ? "ما أعرف وش تحب." : "I don't know your interests yet.";
    if (key === "goals" || key === "goal") return isArabic ? "ما أعرف وش هدفك." : "I don't know your goal yet.";

    return isArabic ? "ما أعرف هالمعلومة حتى الآن." : "I don't have that information yet.";
  }
}
