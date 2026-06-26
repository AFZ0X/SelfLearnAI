import { describe, it, expect, vi } from "vitest";
import { LearningExtractionService } from "@/lib/ai/learning/LearningExtractionService";
import { SensitivityClassifier } from "@/lib/ai/learning/SensitivityClassifier";
import { IntentAnalyzer } from "@/lib/ai/reasoning/IntentAnalyzer";
import { TaskClassifier } from "@/lib/ai/reasoning/TaskClassifier";
import { ReasoningPlanner } from "@/lib/ai/reasoning/ReasoningPlanner";
import { NameExtractorService } from "@/lib/ai/memory/NameExtractorService";
import { ProfileFactExtractor } from "@/lib/ai/memory/ProfileFactExtractor";
import { MemoryConflictResolver } from "@/lib/ai/memory/MemoryConflictResolver";

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

describe("ProfileFactExtractor", () => {
  const extractor = new ProfileFactExtractor();

  describe("extract — Arabic patterns", () => {
    it("extracts age from 'عمري 20'", () => {
      const fact = extractor.extract("عمري 20");
      expect(fact).not.toBeNull();
      expect(fact!.key).toBe("age");
      expect(fact!.value).toBe("20");
    });

    it("extracts age from 'عمري هو 20'", () => {
      const fact = extractor.extract("عمري هو 20");
      expect(fact).not.toBeNull();
      expect(fact!.key).toBe("age");
      expect(fact!.value).toBe("20");
    });

    it("extracts age from 'أنا عمري 20'", () => {
      const fact = extractor.extract("أنا عمري 20");
      expect(fact).not.toBeNull();
      expect(fact!.key).toBe("age");
      expect(fact!.value).toBe("20");
    });

    it("extracts age from 'اقولك عمري هو 20'", () => {
      const fact = extractor.extract("اقولك عمري هو 20");
      expect(fact).not.toBeNull();
      expect(fact!.key).toBe("age");
      expect(fact!.value).toBe("20");
    });

    it("extracts age from 'اقولك عمري 20'", () => {
      const fact = extractor.extract("اقولك عمري 20");
      expect(fact).not.toBeNull();
      expect(fact!.key).toBe("age");
      expect(fact!.value).toBe("20");
    });

    it("extracts age from 'I am 20 years old'", () => {
      const fact = extractor.extract("I am 20 years old");
      expect(fact).not.toBeNull();
      expect(fact!.key).toBe("age");
      expect(fact!.value).toBe("20");
    });

    it("extracts city from 'ساكن في الخبر'", () => {
      const fact = extractor.extract("ساكن في الخبر");
      expect(fact).not.toBeNull();
      expect(fact!.key).toBe("city");
      expect(fact!.value).toBe("الخبر");
    });

    it("extracts interests from 'أحب السيارات'", () => {
      const fact = extractor.extract("أحب السيارات");
      expect(fact).not.toBeNull();
      expect(fact!.key).toBe("interests");
      expect(fact!.value).toBe("السيارات");
    });

    it("extracts goal from 'هدفي أدخل أرامكو'", () => {
      const fact = extractor.extract("هدفي أدخل أرامكو");
      expect(fact).not.toBeNull();
      expect(fact!.key).toBe("goal");
      expect(fact!.value).toContain("أرامكو");
    });

    it("extracts name from 'اسمي عبدالعزيز'", () => {
      const fact = extractor.extract("اسمي عبدالعزيز");
      expect(fact).not.toBeNull();
      expect(fact!.key).toBe("name");
      expect(fact!.value).toBe("عبدالعزيز");
    });

    it("extracts location from 'i live in Riyadh'", () => {
      const fact = extractor.extract("i live in Riyadh");
      expect(fact).not.toBeNull();
      expect(fact!.key).toBe("location");
      expect(fact!.value).toBe("Riyadh");
    });
  });

  describe("detectQuery — Arabic/English profile queries", () => {
    it("detects 'كم عمري' as age query", () => {
      const q = extractor.detectQuery("كم عمري");
      expect(q).not.toBeNull();
      expect(q!.key).toBe("age");
    });

    it("detects 'كم عمري؟' as age query", () => {
      const q = extractor.detectQuery("كم عمري؟");
      expect(q).not.toBeNull();
      expect(q!.key).toBe("age");
    });

    it("detects 'how old am i' as age query", () => {
      const q = extractor.detectQuery("how old am i");
      expect(q).not.toBeNull();
      expect(q!.key).toBe("age");
    });

    it("detects 'وش اسمي' as name query", () => {
      const q = extractor.detectQuery("وش اسمي");
      expect(q).not.toBeNull();
      expect(q!.key).toBe("name");
    });

    it("detects 'وين ساكن' as city query", () => {
      const q = extractor.detectQuery("وين ساكن");
      expect(q).not.toBeNull();
      expect(q!.key).toBe("city");
    });

    it("detects 'وش أحب' as interests query", () => {
      const q = extractor.detectQuery("وش أحب");
      expect(q).not.toBeNull();
      expect(q!.key).toBe("interests");
    });

    it("detects 'وش هدفي' as goal query", () => {
      const q = extractor.detectQuery("وش هدفي");
      expect(q).not.toBeNull();
      expect(q!.key).toBe("goal");
    });

    it("returns null for non-profile query", () => {
      expect(extractor.detectQuery("كيف الطقس اليوم")).toBeNull();
      expect(extractor.detectQuery("ما هو TypeScript")).toBeNull();
    });
  });
});

describe("MemoryConflictResolver", () => {
  const resolver = new MemoryConflictResolver();

  describe("resolve", () => {
    it("returns null when no active memory exists for key", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      (prisma.memory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const result = await resolver.resolve("user1", "age", "mem2");
      expect(result).toBeNull();
    });

    it("supersedes existing active memory when conflict found", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      (prisma.memory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "mem1", text: "14" });
      const updateMock = vi.fn().mockResolvedValue({});
      prisma.memory.update = updateMock;
      const result = await resolver.resolve("user1", "age", "mem2");
      expect(result).not.toBeNull();
      expect(result!.oldId).toBe("mem1");
      expect(result!.newId).toBe("mem2");
      expect(result!.key).toBe("age");
      expect(result!.resolved).toBe(true);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: "mem1" },
        data: { status: "SUPERSEDED", supersededById: "mem2", confidence: 0.1 },
      });
    });
  });
});

describe("IntentAnalyzer — profile query detection", () => {
  const intentAnalyzer = new IntentAnalyzer();

  it("classifies 'كم عمري' as ASK_PERSONAL", () => {
    const result = intentAnalyzer.analyze("كم عمري");
    expect(result.goal).toBe("ASK_PERSONAL");
  });

  it("classifies 'how old am i' as ASK_PERSONAL", () => {
    const result = intentAnalyzer.analyze("how old am i");
    expect(result.goal).toBe("ASK_PERSONAL");
  });

  it("classifies 'وين ساكن' as ASK_PERSONAL", () => {
    const result = intentAnalyzer.analyze("وين ساكن");
    expect(result.goal).toBe("ASK_PERSONAL");
  });

  it("classifies 'وش أحب' as ASK_PERSONAL", () => {
    const result = intentAnalyzer.analyze("وش أحب");
    expect(result.goal).toBe("ASK_PERSONAL");
  });

  it("classifies 'وش هدفي' as ASK_PERSONAL", () => {
    const result = intentAnalyzer.analyze("وش هدفي");
    expect(result.goal).toBe("ASK_PERSONAL");
  });
});

describe("LearningExtractionService — Arabic age/location/preference patterns", () => {
  const extractionService = new LearningExtractionService();

  it("extracts age from 'عمري 20'", () => {
    const candidates = extractionService.extractCandidates("عمري 20");
    const ageCandidates = candidates.filter((c) => c.tags.includes("age"));
    expect(ageCandidates.length).toBeGreaterThanOrEqual(1);
    expect(ageCandidates[0].text).toContain("20");
    expect(ageCandidates[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("extracts age from 'عمري هو 20'", () => {
    const candidates = extractionService.extractCandidates("عمري هو 20");
    const ageCandidates = candidates.filter((c) => c.tags.includes("age"));
    expect(ageCandidates.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts location from 'ساكن في الخبر'", () => {
    const candidates = extractionService.extractCandidates("ساكن في الخبر");
    const locCandidates = candidates.filter((c) => c.tags.includes("location"));
    expect(locCandidates.length).toBeGreaterThanOrEqual(1);
    expect(locCandidates[0].text).toContain("الخبر");
  });

  it("extracts preference from 'أحب السيارات'", () => {
    const candidates = extractionService.extractCandidates("أحب السيارات");
    const prefCandidates = candidates.filter((c) => c.tags.includes("preference"));
    expect(prefCandidates.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts goal from 'هدفي أدخل أرامكو'", () => {
    const candidates = extractionService.extractCandidates("هدفي أدخل أرامكو");
    const goalCandidates = candidates.filter((c) => c.tags.includes("goal"));
    expect(goalCandidates.length).toBeGreaterThanOrEqual(1);
    expect(goalCandidates[0].text).toContain("أرامكو");
  });

  it("extracts work from 'أشتغل في شركة'", () => {
    const candidates = extractionService.extractCandidates("أشتغل في شركة");
    const workCandidates = candidates.filter((c) => c.tags.includes("work"));
    expect(workCandidates.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts education from 'أدرس هندسة'", () => {
    const candidates = extractionService.extractCandidates("أدرس هندسة");
    const eduCandidates = candidates.filter((c) => c.tags.includes("education"));
    expect(eduCandidates.length).toBeGreaterThanOrEqual(1);
  });
});
