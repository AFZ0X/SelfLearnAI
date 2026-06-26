import type { SearchProvider, SearchResult } from "../SearchProvider";

export class MockSearchProvider implements SearchProvider {
  async search(query: string, count = 3): Promise<SearchResult[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const ar = /[\u0600-\u06FF]/.test(query);

    if (ar) {
      return [
        {
          title: `[وهمي] نتيجة تجريبية لـ "${query}" — نظرة عامة`,
          url: "https://example.com/mock-ar-overview",
          snippet: `هذه نتيجة وهمية لأغراض التطوير فقط. أنت تستخدم مزود البحث الوهمي (Mock Search Provider). لاستخدام البحث الحقيقي، عيّن SEARCH_PROVIDER=tavily و TAVILY_API_KEY في متغيرات البيئة.`,
        },
        {
          title: `[وهمي] نتيجة تجريبية لـ "${query}" — تفاصيل`,
          url: "https://example.com/mock-ar-details",
          snippet: `نتيجة وهمية إضافية حول "${query}". هذه النتائج معلّمة بوضوح على أنها وهمية ومخصصة للتطوير فقط. لا يمكن الاعتماد عليها كمصادر حقيقية.`,
        },
      ].slice(0, count);
    }

    return [
      {
        title: `[MOCK] Development result for: "${query}" — Overview`,
        url: "https://example.com/mock-overview",
        snippet: `This is a MOCK search result — development only. You are using the Mock Search Provider. To use real web search, set SEARCH_PROVIDER=tavily with TAVILY_API_KEY, or SEARCH_PROVIDER=brave with BRAVE_API_KEY.`,
      },
      {
        title: `[MOCK] Development result for: "${query}" — Details`,
        url: "https://example.com/mock-details",
        snippet: `Additional MOCK information about "${query}". These results are clearly labeled as mock/development-only and must not be treated as real web content.`,
      },
    ].slice(0, count);
  }
}
