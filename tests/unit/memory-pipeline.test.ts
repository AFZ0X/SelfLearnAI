import { describe, it, expect, vi } from "vitest";
import { LearningExtractionService } from "@/lib/ai/learning/LearningExtractionService";
import { SensitivityClassifier } from "@/lib/ai/learning/SensitivityClassifier";
import { IntentAnalyzer } from "@/lib/ai/reasoning/IntentAnalyzer";
import { TaskClassifier } from "@/lib/ai/reasoning/TaskClassifier";
import { ReasoningPlanner } from "@/lib/ai/reasoning/ReasoningPlanner";
import { NameExtractorService } from "@/lib/ai/memory/NameExtractorService";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    memory: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    memoryEmbedding: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/embeddings/EmbeddingProvider", () => ({
  getEmbeddingProvider: () => ({
    generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
  }),
}));

vi.mock("@/lib/db/embeddings", () => ({
  saveEmbedding: vi.fn().mockResolvedValue(undefined),
}));

describe("Memory Pipeline — Name Extraction & Retrieval", () => {
  const extractionService = new LearningExtractionService();
  const intentAnalyzer = new IntentAnalyzer();
  const taskClassifier = new TaskClassifier();
  const planner = new ReasoningPlanner();

  describe("LearningExtractionService — Arabic patterns", () => {
    it("extracts name from 'اسمي عبدالعزيز'", () => {
      const candidates = extractionService.extractCandidates("اسمي عبدالعزيز");
      const nameCandidates = candidates.filter((c) => c.tags.includes("user_info"));
      expect(nameCandidates.length).toBeGreaterThanOrEqual(1);
      expect(nameCandidates[0].text).toContain("عبدالعزيز");
      expect(nameCandidates[0].confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("extracts name from 'اسمي الكامل عبدالعزيز'", () => {
      const candidates = extractionService.extractCandidates("اسمي الكامل عبدالعزيز");
      const nameCandidates = candidates.filter((c) => c.tags.includes("user_info"));
      expect(nameCandidates.length).toBeGreaterThanOrEqual(1);
    });

    it("extracts name from 'أنا عبدالعزيز'", () => {
      const candidates = extractionService.extractCandidates("أنا عبدالعزيز");
      const nameCandidates = candidates.filter((c) => c.tags.includes("user_info"));
      expect(nameCandidates.length).toBeGreaterThanOrEqual(1);
    });

    it("extracts name from 'نادني أبو خالد'", () => {
      const candidates = extractionService.extractCandidates("نادني أبو خالد");
      const nameCandidates = candidates.filter((c) => c.tags.includes("user_info"));
      expect(nameCandidates.length).toBeGreaterThanOrEqual(1);
      expect(nameCandidates[0].text).toContain("أبو خالد");
    });

    it("extracts name from 'ناديني أحمد'", () => {
      const candidates = extractionService.extractCandidates("ناديني أحمد");
      const nameCandidates = candidates.filter((c) => c.tags.includes("user_info"));
      expect(nameCandidates.length).toBeGreaterThanOrEqual(1);
    });

    it("extracts name from 'My name is Khalid'", () => {
      const candidates = extractionService.extractCandidates("My name is Khalid");
      const nameCandidates = candidates.filter((c) => c.tags.includes("user_info"));
      expect(nameCandidates.length).toBeGreaterThanOrEqual(1);
      expect(nameCandidates[0].text).toContain("Khalid");
    });

    it("extracts name from 'Call me Ahmed'", () => {
      const candidates = extractionService.extractCandidates("Call me Ahmed");
      const nameCandidates = candidates.filter((c) => c.tags.includes("user_info"));
      expect(nameCandidates.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("IntentAnalyzer — name query detection", () => {
    it("classifies 'وش اسمي؟' as ASK_PERSONAL", () => {
      const result = intentAnalyzer.analyze("وش اسمي؟");
      expect(result.goal).toBe("ASK_PERSONAL");
      expect(result.language).toBe("ar");
    });

    it("classifies 'ما اسمي' as ASK_PERSONAL", () => {
      const result = intentAnalyzer.analyze("ما اسمي");
      expect(result.goal).toBe("ASK_PERSONAL");
    });

    it("classifies what's my name as ASK_PERSONAL", () => {
      const result = intentAnalyzer.analyze("what's my name?");
      expect(result.goal).toBe("ASK_PERSONAL");
    });

    it("classifies 'do you know my name' as ASK_PERSONAL", () => {
      const result = intentAnalyzer.analyze("do you know my name?");
      expect(result.goal).toBe("ASK_PERSONAL");
    });
  });

  describe("TaskClassifier — maps ASK_PERSONAL correctly", () => {
    it("maps ASK_PERSONAL to PERSONAL_MEMORY task", () => {
      const task = taskClassifier.classify({ goal: "ASK_PERSONAL" });
      expect(task.type).toBe("PERSONAL_MEMORY");
      expect(task.needsMemory).toBe(true);
    });
  });

  describe("ReasoningPlanner — PERSONAL_MEMORY with memory", () => {
    it("creates MEMORY_ONLY plan when memory exists", () => {
      const task = taskClassifier.classify({ goal: "ASK_PERSONAL" });
      const plan = planner.plan(task, false, true);
      expect(plan.planType).toBe("MEMORY_ONLY");
      expect(plan.requiresMemory).toBe(true);
    });

    it("creates UNCERTAIN_ANSWER plan when no memory exists", () => {
      const task = taskClassifier.classify({ goal: "ASK_PERSONAL" });
      const plan = planner.plan(task, false, false);
      expect(plan.planType).toBe("UNCERTAIN_ANSWER");
      expect(plan.requiresMemory).toBe(false);
    });
  });

  describe("SensitivityClassifier — name is LOW sensitivity", () => {
    const classifier = new SensitivityClassifier();

    it("classifies name as LOW sensitivity", () => {
      expect(classifier.classify("اسمي عبدالعزيز")).toBe("LOW");
    });

    it("classifies 'My name is John' as LOW", () => {
      expect(classifier.classify("My name is John")).toBe("LOW");
    });
  });
});

describe("NameExtractorService", () => {
  const extractor = new NameExtractorService();

  describe("extractName", () => {
    it("extracts name from Arabic introduction 'اسمي عبدالعزيز'", () => {
      expect(extractor.extractName("اسمي عبدالعزيز")).toBe("عبدالعزيز");
    });

    it("extracts name from 'اسمي الكامل عبدالعزيز'", () => {
      expect(extractor.extractName("اسمي الكامل عبدالعزيز")).toBe("عبدالعزيز");
    });

    it("extracts name from 'أنا عبدالعزيز'", () => {
      expect(extractor.extractName("أنا عبدالعزيز")).toBe("عبدالعزيز");
    });

    it("extracts name from 'نادني أبو خالد'", () => {
      expect(extractor.extractName("نادني أبو خالد")).toBe("أبو خالد");
    });

    it("extracts name from 'ناديني أحمد'", () => {
      expect(extractor.extractName("ناديني أحمد")).toBe("أحمد");
    });

    it("extracts name from 'My name is Khalid'", () => {
      expect(extractor.extractName("My name is Khalid")).toBe("Khalid");
    });

    it("extracts name from 'Call me Alex'", () => {
      expect(extractor.extractName("Call me Alex")).toBe("Alex");
    });

    it("returns null for text without name introduction", () => {
      expect(extractor.extractName("كيف حالك")).toBeNull();
      expect(extractor.extractName("What is TypeScript?")).toBeNull();
    });

    it("returns null for empty text", () => {
      expect(extractor.extractName("")).toBeNull();
    });
  });

  describe("isNameQuery", () => {
    it("detects 'وش اسمي' as name query", () => {
      expect(extractor.isNameQuery("وش اسمي")).toBe(true);
    });

    it("detects 'وش اسمي؟' as name query", () => {
      expect(extractor.isNameQuery("وش اسمي؟")).toBe(true);
    });

    it("detects 'ما اسمي' as name query", () => {
      expect(extractor.isNameQuery("ما اسمي")).toBe(true);
    });

    it("detects 'what's my name?' as name query", () => {
      expect(extractor.isNameQuery("what's my name?")).toBe(true);
    });

    it("detects 'Do you know my name?' as name query", () => {
      expect(extractor.isNameQuery("Do you know my name?")).toBe(true);
    });

    it("returns false for non-name queries", () => {
      expect(extractor.isNameQuery("كيف حالك")).toBe(false);
      expect(extractor.isNameQuery("ما هو الطقس")).toBe(false);
    });
  });
});
