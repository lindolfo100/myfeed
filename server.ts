import express from "express";
import { createServer as createViteServer } from "vite";
import Parser from "rss-parser";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parser = new Parser({
  customFields: {
    item: [
      ["media:group", "mediaGroup"],
      ["media:thumbnail", "mediaThumbnail"],
      ["media:content", "mediaContent"],
    ],
  },
});
const db = new Database("feeds.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    name TEXT
  )
`);

// Seed initial feeds if empty
const count = db.prepare("SELECT count(*) as count FROM feeds").get() as { count: number };
if (count.count === 0) {
  const insert = db.prepare("INSERT INTO feeds (url, type, name) VALUES (?, ?, ?)");
  insert.run("https://www.reddit.com/r/webdev.json", "reddit", "Reddit /r/webdev");
  insert.run("https://www.youtube.com/feeds/videos.xml?channel_id=UC29ju8bIPH5as8OGnQzwJyA", "youtube", "Traversy Media");
  insert.run("https://feeds.megaphone.fm/the-daily", "podcast", "The Daily");
  insert.run("https://css-tricks.com/feed/", "blog", "CSS-Tricks");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Manage Feeds
  app.get("/api/feeds", (req, res) => {
    const feeds = db.prepare("SELECT * FROM feeds").all();
    res.json(feeds);
  });

  app.post("/api/feeds", async (req, res) => {
    let { url, type, name } = req.body;
    try {
      if (type === "blog") {
        url = await findRssUrl(url);
      }
      const insert = db.prepare("INSERT INTO feeds (url, type, name) VALUES (?, ?, ?)");
      const result = insert.run(url, type, name);
      res.json({ id: result.lastInsertRowid, url, type, name });
    } catch (err) {
      res.status(400).json({ error: "Feed already exists or invalid data" });
    }
  });

  app.delete("/api/feeds/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM feeds WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Helper to resolve YouTube handle to RSS
  const resolveYoutubeUrl = async (url: string): Promise<string> => {
    if (url.includes("youtube.com/@") || (url.includes("youtube.com/c/") && !url.includes("feeds/videos.xml"))) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "PersonalFeedReader/1.0.0 (by /u/anonymous; contact: diego.silva6@prof.ce.gov.br)"
          }
        });
        const html = await response.text();
        // Look for the RSS link in the HTML
        const match = html.match(/https:\/\/www\.youtube\.com\/feeds\/videos\.xml\?channel_id=([a-zA-Z0-9_-]+)/);
        if (match && match[0]) {
          return match[0];
        }
      } catch (e) {
        console.error("Failed to resolve YouTube handle:", e);
      }
    }
    return url;
  };

  // Helper to find RSS feed in HTML
  const findRssUrl = async (url: string): Promise<string> => {
    try {
      const fetchOptions = {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      };
      
      const response = await fetch(url, fetchOptions);
      const html = await response.text();
      
      // 1. Look for <link rel="alternate" type="application/rss+xml" href="...">
      const rssMatch = html.match(/<link[^>]+type=["']application\/rss\+xml["'][^>]+href=["']([^"']+)["']/i) ||
                       html.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/rss\+xml["']/i);
      
      if (rssMatch && rssMatch[1]) {
        return new URL(rssMatch[1], url).toString();
      }
      
      // 2. Look for <link rel="alternate" type="application/atom+xml" href="...">
      const atomMatch = html.match(/<link[^>]+type=["']application\/atom\+xml["'][^>]+href=["']([^"']+)["']/i) ||
                        html.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/atom\+xml["']/i);
      
      if (atomMatch && atomMatch[1]) {
        return new URL(atomMatch[1], url).toString();
      }

      // 3. Look for <a> tags that look like feeds in the body (including Portuguese terms)
      const bodyFeedMatch = html.match(/<a[^>]+href=["']([^"']*(?:feed|rss|xml)[^"']*)["'][^>]*>(?:RSS|Feed|Podcast|Assinar|Canal)/i);
      if (bodyFeedMatch && bodyFeedMatch[1]) {
        return new URL(bodyFeedMatch[1], url).toString();
      }

      // 4. Fallback: try common paths
      const baseUrl = new URL(url);
      const commonPaths = ["/feed", "/rss", "/rss.xml", "/feed.xml", "/feed/", "/rss/"];
      
      // Special case for Jovem Nerd
      if (url.includes("jovemnerd.com.br")) {
        const parts = url.split("/").filter(Boolean);
        const lastPart = parts[parts.length - 1];
        commonPaths.unshift(
          `/feed-${lastPart}/`, 
          `/feed-${lastPart}`, 
          `/categoria/${lastPart}/feed/`,
          `/feed/`,
          `/rss/`
        );
      }

      for (const path of commonPaths) {
        const testUrl = new URL(path, baseUrl).toString();
        try {
          const testRes = await fetch(testUrl, { ...fetchOptions, method: "GET" });
          const ct = testRes.headers.get("content-type") || "";
          const body = await testRes.text();
          const isXml = ct.includes("xml") || ct.includes("rss") || ct.includes("application/octet-stream") || body.trim().startsWith("<?xml");
          
          if (testRes.ok && isXml) {
            return testUrl;
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error("Feed discovery failed for:", url, e);
    }
    return url;
  };

  // Feed Aggregator
  app.get("/api/feed", async (req, res) => {
    try {
      const feeds = db.prepare("SELECT * FROM feeds").all() as any[];

      const results = await Promise.all(
        feeds.map(async (feed) => {
          try {
            let targetUrl = feed.url;
            
            // Hardcoded overrides for common problematic feeds (Jovem Nerd)
            if (targetUrl.includes("jovemnerd.com.br")) {
              if (targetUrl.includes("nerdcast")) targetUrl = "https://jovemnerd.com.br/feed-nerdcast/";
              else if (targetUrl.includes("nerdologia")) {
                // Use the handle which our resolveYoutubeUrl can handle
                targetUrl = "https://www.youtube.com/@nerdologia";
              }
              else if (targetUrl.includes("canaldonerd")) targetUrl = "https://jovemnerd.com.br/feed-canaldonerd/";
              else if (targetUrl.includes("mauacompanhado")) targetUrl = "https://jovemnerd.com.br/feed-mauacompanhado/";
              else if (targetUrl.includes("podcasts")) {
                const parts = targetUrl.split("/").filter(Boolean);
                const lastPart = parts[parts.length - 1];
                targetUrl = `https://jovemnerd.com.br/feed-${lastPart}/`;
              }
            }

            if (feed.type === "youtube" || targetUrl.includes("youtube.com")) {
              targetUrl = await resolveYoutubeUrl(targetUrl);
            }

            const fetchOptions = {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
              }
            };

            if (feed.type === "reddit") {
              // Reddit's JSON API is increasingly blocking unauthenticated requests with 403s.
              // Instead, we'll use their RSS feeds which are generally more permissive.
              targetUrl = targetUrl.replace("old.reddit.com", "www.reddit.com");
              if (targetUrl.includes(".json")) {
                targetUrl = targetUrl.replace(".json", ".rss");
              } else if (!targetUrl.includes(".rss")) {
                targetUrl = targetUrl.replace(/\/$/, "") + ".rss";
              }
              
              const response = await fetch(targetUrl, fetchOptions);
              if (!response.ok) {
                throw new Error(`Reddit returned status ${response.status} for ${targetUrl}`);
              }
              
              const text = await response.text();
              const parsed = await parser.parseString(text);
              
              return parsed.items.map((item: any) => {
                // Try to extract a thumbnail from the HTML content if available
                let thumbnail = null;
                if (item.content) {
                  const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
                  if (imgMatch && imgMatch[1] && !imgMatch[1].includes("thumbs.redditmedia.com")) {
                     thumbnail = imgMatch[1];
                  }
                }

                return {
                  id: item.guid || item.id || item.link,
                  title: item.title,
                  link: item.link,
                  date: item.isoDate || item.pubDate || new Date().toISOString(),
                  source: feed.name || "Reddit",
                  type: "reddit",
                  thumbnail: thumbnail,
                  summary: item.contentSnippet || null,
                  content: item.content || null,
                };
              });
            } else {
              let response;
              try {
                response = await fetch(targetUrl, fetchOptions);
                
                // If 404, try to find the RSS URL from the original feed URL
                if (response.status === 404) {
                  const discoveredUrl = await findRssUrl(feed.url);
                  if (discoveredUrl !== targetUrl) {
                    response = await fetch(discoveredUrl, fetchOptions);
                  }
                }
              } catch (fetchErr) {
                console.log(`Fetch exception for ${targetUrl}:`, fetchErr);
                response = { ok: false, status: 0 };
              }

              if (!response.ok) {
                console.log(`Direct fetch failed for ${targetUrl} with status ${response.status}. Trying rss2json fallback...`);
                try {
                  const fallbackUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(targetUrl)}`;
                  const fallbackResponse = await fetch(fallbackUrl);
                  if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData.status === 'ok') {
                      return fallbackData.items.map((item: any) => {
                        return {
                          id: item.guid || item.link,
                          title: item.title,
                          link: item.link,
                          date: new Date(item.pubDate || new Date()).toISOString(),
                          source: feed.name || fallbackData.feed.title || feed.type,
                          type: feed.type,
                          thumbnail: item.thumbnail || item.enclosure?.link || null,
                          audioUrl: item.enclosure?.type?.includes("audio") ? item.enclosure.link : null,
                          summary: item.description || null,
                          content: item.content || item.description || null,
                        };
                      });
                    }
                  }
                } catch (fallbackErr) {
                  console.error("Fallback failed:", fallbackErr);
                }
                throw new Error(`Feed returned status ${response.status} for URL: ${targetUrl}`);
              }
              
              let contentType = response.headers.get("content-type") || "";
              let text = await response.text();
              
              const isLikelyHtml = (t: string, ct: string) => 
                t.trim().toLowerCase().startsWith("<!doctype html") || 
                t.trim().toLowerCase().startsWith("<html") ||
                ct.includes("text/html");

              if (isLikelyHtml(text, contentType)) {
                const discoveredUrl = await findRssUrl(targetUrl);
                if (discoveredUrl !== targetUrl) {
                  response = await fetch(discoveredUrl, fetchOptions);
                  if (response.ok) {
                    text = await response.text();
                    contentType = response.headers.get("content-type") || "";
                  }
                }
              }

              if (isLikelyHtml(text, contentType)) {
                if (feed.type === "youtube") throw new Error("Could not find RSS feed for this YouTube channel.");
                throw new Error("URL returned HTML instead of RSS/XML.");
              }

              try {
                const parsed = await parser.parseString(text);
                return parsed.items.map((item: any) => {
                  let thumbnail = null;
                  
                  // 1. Check enclosure (common for podcasts/media)
                  if (item.enclosure && item.enclosure.url && item.enclosure.type?.includes("image")) {
                    thumbnail = item.enclosure.url;
                  }
                  
                  // 2. Check iTunes image (very common for podcasts)
                  if (!thumbnail && item.itunes) {
                    thumbnail = typeof item.itunes.image === "string" ? item.itunes.image : item.itunes.image?.href;
                  }
                  
                  // 3. Check Media Group or Media Content
                  if (!thumbnail) {
                    if (item.mediaGroup) {
                      const mediaThumbnail = item.mediaGroup["media:thumbnail"];
                      if (mediaThumbnail && mediaThumbnail[0] && mediaThumbnail[0].$) {
                        thumbnail = mediaThumbnail[0].$.url;
                      }
                      const mediaContent = item.mediaGroup["media:content"];
                      if (!thumbnail && mediaContent && mediaContent[0] && mediaContent[0].$) {
                        thumbnail = mediaContent[0].$.url;
                      }
                    }
                    
                    // Check the custom field mediaContent
                    if (!thumbnail && item.mediaContent) {
                      // media:content can be an array or object
                      const mc = Array.isArray(item.mediaContent) ? item.mediaContent[0] : item.mediaContent;
                      thumbnail = mc?.$?.url || mc?.url;
                    }
                  }

                  // 4. Check standard thumbnail or content:encoded for images
                  if (!thumbnail && item.thumbnail) {
                    thumbnail = typeof item.thumbnail === "string" ? item.thumbnail : item.thumbnail?.$?.url;
                  }

                  // 5. Fallback to enclosure if it's any URL (sometimes used for images without correct type)
                  if (!thumbnail && item.enclosure?.url) {
                    thumbnail = item.enclosure.url;
                  }

                  return {
                    id: item.id || item.guid || item.link,
                    title: item.title,
                    link: item.link,
                    date: new Date(item.pubDate || item.isoDate || new Date()).toISOString(),
                    source: feed.name || parsed.title || feed.type,
                    type: feed.type,
                    thumbnail,
                    audioUrl: item.enclosure?.url && item.enclosure.type?.includes("audio") ? item.enclosure.url : null,
                    summary: item.contentSnippet || item.summary || null,
                    content: item.content || item["content:encoded"] || item.summary || null,
                  };
                });
              } catch (parseErr) {
                // If parsing failed, try discovery one last time even if it didn't look like HTML
                const discoveredUrl = await findRssUrl(targetUrl);
                if (discoveredUrl !== targetUrl) {
                  const retryRes = await fetch(discoveredUrl, fetchOptions);
                  if (retryRes.ok) {
                    const retryText = await retryRes.text();
                    const retryParsed = await parser.parseString(retryText);
                    return retryParsed.items.map((item: any) => ({
                      id: item.id || item.guid || item.link,
                      title: item.title,
                      link: item.link,
                      date: new Date(item.pubDate || item.isoDate || new Date()).toISOString(),
                      source: feed.name || retryParsed.title || feed.type,
                      type: feed.type,
                      thumbnail: item.enclosure?.url || (item.itunes && item.itunes.image) || null,
                      audioUrl: item.enclosure?.url && item.enclosure.type?.includes("audio") ? item.enclosure.url : null,
                      summary: item.contentSnippet || item.summary || null,
                      content: item.content || item["content:encoded"] || item.summary || null,
                    }));
                  }
                }
                throw parseErr;
              }
            }
          } catch (err) {
            console.error(`Error fetching ${feed.url}:`, err instanceof Error ? err.message : err);
            return [];
          }
        })
      );

      const flattened = results.flat().sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      res.json(flattened);
    } catch (error) {
      console.error("Feed error:", error);
      res.status(500).json({ error: "Failed to fetch feeds" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
