import { MemoryRetrievalServiceV2, type RetrievedMemoryV2 } from "./MemoryRetrievalServiceV2";
import { MemoryUpdateService } from "./MemoryUpdateService";
import { ProfileFactExtractor } from "./ProfileFactExtractor";
import { NameExtractorService } from "./NameExtractorService";

export class MemoryAnswerService {
  private retrieval = new MemoryRetrievalServiceV2();
  private update = new MemoryUpdateService();
  private profileExtractor = new ProfileFactExtractor();
  private nameExtractor = new NameExtractorService();

  async answerFromMemory(
    userId: string,
    queryText: string,
    ignoreMemory: boolean
  ): Promise<{ answer: string | null; memoryUsed: boolean; retrievalMode: string }> {
    if (ignoreMemory) {
      return { answer: null, memoryUsed: false, retrievalMode: "ignored" };
    }

    // ONLY answer directly for explicit profile queries (e.g. "وش اسمي؟", "كم عمري؟")
    // NEVER use vector search results for direct answers — they may be irrelevant
    const profileQuery = this.profileExtractor.detectQuery(queryText);
    const isNameQuery = this.nameExtractor.isNameQuery(queryText);

    if (!profileQuery && !isNameQuery) {
      return { answer: null, memoryUsed: false, retrievalMode: "none" };
    }

    const key = profileQuery?.key || "name";
    const exact = await this.retrieval.lookupExact(userId, key);
    if (exact) {
      await this.update.touch(exact.id);
      const answer = this.buildAnswer(exact, queryText);
      return { answer, memoryUsed: true, retrievalMode: "exact" };
    }

    return { answer: null, memoryUsed: false, retrievalMode: "exact" };
  }

  private buildAnswer(fact: RetrievedMemoryV2, queryText: string): string {
    // Extract clean value from summary ("key: value") or fall back to text
    const value = fact.summary?.includes(": ")
      ? fact.summary.split(": ").slice(1).join(": ")
      : fact.text;
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

  async lookupExact(userId: string, key: string): Promise<RetrievedMemoryV2 | null> {
    return this.retrieval.lookupExact(userId, key);
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
