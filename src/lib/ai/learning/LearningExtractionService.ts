import { SensitivityClassifier, isBlockedSensitivity, requiresApproval, type SensitivityLevel } from "./SensitivityClassifier";
import type { LearningCandidateService } from "./LearningCandidateService";
import type { LearningConfigService } from "./LearningConfigService";

export interface ExtractionCandidate {
  text: string;
  summary?: string;
  source?: string;
  sensitivity: SensitivityLevel;
  confidence: number;
  tags: string[];
  blocked: boolean;
  requiresApproval: boolean;
}

const EXTRACTION_PATTERNS = [
  { pattern: /my name is (\w+)/i, tag: "user_info", confidence: 0.9 },
  { pattern: /i (?:am|'m) (?:a|an) (\w+)/i, tag: "user_info", confidence: 0.7 },
  { pattern: /اسمي\s+الكامل\s+(.+)/i, tag: "user_info", confidence: 0.9 },
  { pattern: /اسمي\s+(.+)/i, tag: "user_info", confidence: 0.9 },
  { pattern: /أنا\s+(.+)/i, tag: "user_info", confidence: 0.7 },
  { pattern: /نادني\s+(.+)/i, tag: "user_info", confidence: 0.8 },
  { pattern: /ناديني\s+(.+)/i, tag: "user_info", confidence: 0.8 },
  { pattern: /i (?:like|love|enjoy) (\w+)/i, tag: "preference", confidence: 0.7 },
  { pattern: /i (?:work|works|job) (?:as|at|for) (.+)/i, tag: "work", confidence: 0.8 },
  { pattern: /i (?:live|lives|stay) (?:in|at) (.+)/i, tag: "location", confidence: 0.8 },
  { pattern: /my (?:favorite|fav) (\w+)/i, tag: "preference", confidence: 0.7 },
  { pattern: /i (?:use|using|used) (\w+)/i, tag: "tool", confidence: 0.6 },
  { pattern: /i (?:need|needs|wants?) (\w+)/i, tag: "goal", confidence: 0.6 },
  { pattern: /i (?:have|has) (\d+) (?:years? of )?experience/i, tag: "experience", confidence: 0.8 },
  { pattern: /i (?:learn|learning|studied|study) (\w+)/i, tag: "learning", confidence: 0.7 },
  { pattern: /i (?:know|knows) (\w+)/i, tag: "knowledge", confidence: 0.6 },
  { pattern: /i (?:can|could) (?:help|assist) (?:with|in) (.+)/i, tag: "capability", confidence: 0.7 },
  { pattern: /(?:prefer|preferred) (.+)/i, tag: "preference", confidence: 0.5 },
];

export class LearningExtractionService {
  private classifier = new SensitivityClassifier();

  extractCandidates(userMessage: string, assistantResponse?: string): ExtractionCandidate[] {
    const candidates: ExtractionCandidate[] = [];

    const messages = [userMessage];
    if (assistantResponse) {
      messages.push(assistantResponse);
    }

    for (const msg of messages) {
      const matches = this.findMatches(msg);
      candidates.push(...matches);
    }

    return candidates;
  }

  private findMatches(text: string): ExtractionCandidate[] {
    const candidates: ExtractionCandidate[] = [];

    for (const rule of EXTRACTION_PATTERNS) {
      const match = text.match(rule.pattern);
      if (match) {
        const extractedText = match[0].trim();
        const value = match[1]?.trim();
        const sensitivity = this.classifier.classify(extractedText);

        if (isBlockedSensitivity(sensitivity)) {
          continue;
        }

        candidates.push({
          text: extractedText,
          summary: value ? `Learned: ${value}` : undefined,
          source: "chat",
          sensitivity,
          confidence: rule.confidence,
          tags: [rule.tag],
          blocked: false,
          requiresApproval: requiresApproval(sensitivity, false),
        });
      }
    }

    return candidates;
  }

  async processAndStore(
    userId: string,
    conversationId: string | null,
    userMessage: string,
    assistantResponse: string | undefined,
    candidateService: LearningCandidateService,
    configService: LearningConfigService
  ): Promise<{ stored: number; blocked: number }> {
    const config = await configService.getConfig(userId);

    if (config && !config.learningEnabled) {
      return { stored: 0, blocked: 0 };
    }

    const candidates = this.extractCandidates(userMessage, assistantResponse);

    let stored = 0;
    let blocked = 0;

    for (const candidate of candidates) {
      if (candidate.blocked) {
        blocked++;
        continue;
      }

      const needsApproval = requiresApproval(candidate.sensitivity, config?.autoStoreLow ?? false);

      if (!needsApproval) {
        await candidateService.approveAndStore(userId, {
          text: candidate.text,
          summary: candidate.summary,
          source: candidate.source,
          sensitivity: candidate.sensitivity,
          confidence: candidate.confidence,
          tags: candidate.tags,
        });
        stored++;
      } else {
        await candidateService.create({
          userId,
          conversationId,
          text: candidate.text,
          summary: candidate.summary,
          source: candidate.source,
          sensitivity: candidate.sensitivity,
          status: "PENDING",
          confidence: candidate.confidence,
          tags: candidate.tags,
        });
        stored++;
      }
    }

    return { stored, blocked };
  }
}
