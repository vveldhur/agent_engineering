import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['source', 'guid']
  }
});

export const TOPICS = {
  TOP: 'TOP',
  WORLD: 'WORLD',
  NATION: 'NATION',
  BUSINESS: 'BUSINESS',
  TECHNOLOGY: 'TECHNOLOGY',
  ENTERTAINMENT: 'ENTERTAINMENT',
  SPORTS: 'SPORTS',
  SCIENCE: 'SCIENCE',
  HEALTH: 'HEALTH'
};

const BASE_URL = 'https://news.google.com/rss';

/**
 * Builds Google News RSS feed URL based on options.
 */
function buildFeedUrl({ topic, search, lang = 'en-US', country = 'US' }) {
  const params = `hl=${lang}&gl=${country}&ceid=${country}:en`;

  if (search) {
    return `${BASE_URL}/search?q=${encodeURIComponent(search)}&${params}`;
  }

  if (topic && topic !== TOPICS.TOP) {
    const upperTopic = topic.toUpperCase();
    return `${BASE_URL}/headlines/section/topic/${upperTopic}?${params}`;
  }

  return `${BASE_URL}?${params}`;
}

/**
 * Fetches latest news from Google News RSS feed.
 */
export async function fetchNews(options = {}) {
  const { limit = 10 } = options;
  const feedUrl = buildFeedUrl(options);

  try {
    const feed = await parser.parseURL(feedUrl);
    
    const items = feed.items.slice(0, limit).map((item, index) => {
      let sourceName = 'Google News';
      if (item.source) {
        sourceName = typeof item.source === 'string' ? item.source : item.source._ || item.source.title || sourceName;
      } else if (item.title && item.title.includes(' - ')) {
        const parts = item.title.split(' - ');
        sourceName = parts.pop().trim();
      }

      // Clean up title by removing trailing " - Source Name"
      let cleanTitle = item.title;
      if (cleanTitle.includes(' - ')) {
        const parts = cleanTitle.split(' - ');
        parts.pop();
        cleanTitle = parts.join(' - ').trim();
      }

      return {
        id: index + 1,
        title: cleanTitle || item.title,
        fullTitle: item.title,
        link: item.link,
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        source: sourceName,
        snippet: item.contentSnippet || ''
      };
    });

    return {
      title: feed.title,
      items
    };
  } catch (error) {
    throw new Error(`Failed to fetch Google News: ${error.message}`);
  }
}
