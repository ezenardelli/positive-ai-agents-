'use server';
/**
 * @fileoverview Service function to fetch and process content from a website.
 * This is used to provide context to the Posi Agent.
 */

// A simple in-memory cache to avoid re-fetching the content on every request.
// The cache will be cleared when the server instance restarts.
let cache: { content: string; timestamp: number } | null = null;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches the raw text content from the Positive IT website.
 * It uses a simple in-memory cache to avoid excessive requests.
 * In a real-world, scalable application, this could be replaced with a more robust
 * caching mechanism like Redis or a scheduled job that populates a vector database.
 * @returns {Promise<string>} The text content of the website.
 */
export async function getWebsiteContent(): Promise<string> {
  const now = Date.now();

  if (cache && (now - cache.timestamp) < CACHE_DURATION_MS) {
    console.log('[WebsiteKnowledgeService] Returning content from cache.');
    return cache.content;
  }

  console.log('[WebsiteKnowledgeService] Fetching fresh content from website.');
  try {
    const response = await fetch('https://positiveit.tech/', {
      next: {
        // Revalidate cache every 10 minutes
        revalidate: 600,
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website. Status: ${response.status}`);
    }

    const html = await response.text();
    
    // Basic text extraction. This is a simplified approach.
    // A more advanced implementation would use a library like Cheerio to parse HTML
    // and extract meaningful text content more accurately.
    const textContent = html
      .replace(/<style[^>]*>.*<\/style>/gs, ' ') // Remove style blocks
      .replace(/<script[^>]*>.*<\/script>/gs, ' ') // Remove script blocks
      .replace(/<[^>]+>/g, ' ') // Remove all other HTML tags
      .replace(/\s+/g, ' ') // Replace multiple whitespace chars with a single space
      .trim();

    cache = { content: textContent, timestamp: now };
    
    return textContent;
  } catch (error) {
    console.error('[WebsiteKnowledgeService] Error fetching or parsing website content:', error);
    // Return a fallback error message if the fetch fails
    return 'Error: No se pudo obtener el contenido del sitio web de Positive IT en este momento.';
  }
}
