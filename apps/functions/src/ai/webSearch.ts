import type { AgentKnowledgeSource } from "@ghost/domain";

export interface WebSearchResult {
  answer: string;
  sources: AgentKnowledgeSource[];
}

export async function searchWeb(query: string): Promise<WebSearchResult | null> {
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  if (tavilyKey) {
    return searchWithTavily(query, tavilyKey);
  }

  return searchWithDuckDuckGo(query);
}

async function searchWithTavily(query: string, apiKey: string): Promise<WebSearchResult | null> {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
        include_answer: true,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      answer?: string;
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };

    const sources: AgentKnowledgeSource[] = (data.results ?? []).map((result) => ({
      title: result.title ?? "Fuente web",
      url: result.url ?? "",
      snippet: result.content?.slice(0, 280),
    }));

    const answer =
      data.answer?.trim() ||
      sources.map((source) => `· ${source.title}: ${source.snippet ?? source.url}`).join("\n");

    if (!answer) {
      return null;
    }

    return { answer, sources };
  } catch {
    return null;
  }
}

async function searchWithDuckDuckGo(query: string): Promise<WebSearchResult | null> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      AbstractText?: string;
      AbstractURL?: string;
      AbstractSource?: string;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
    };

    const sources: AgentKnowledgeSource[] = [];
    if (data.AbstractText && data.AbstractURL) {
      sources.push({
        title: data.AbstractSource ?? "DuckDuckGo",
        url: data.AbstractURL,
        snippet: data.AbstractText,
      });
    }

    for (const topic of (data.RelatedTopics ?? []).slice(0, 3)) {
      if (topic.Text && topic.FirstURL) {
        sources.push({
          title: topic.Text.slice(0, 80),
          url: topic.FirstURL,
          snippet: topic.Text,
        });
      }
    }

    const answer =
      data.AbstractText?.trim() ||
      sources.map((source) => `· ${source.snippet ?? source.title}`).join("\n");

    if (!answer) {
      return null;
    }

    return { answer, sources };
  } catch {
    return null;
  }
}
