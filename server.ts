import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(cors());

  // API router for publishing to Luogu
  app.post("/api/luogu/publish", async (req, res) => {

    try {
      let { cookie, title, content, category, lid, solutionFor, isPublic, top } = req.body;

      if (!cookie) {
        return res.status(400).json({ error: "No cookie provided" });
      }

      
    cookie = cookie.replace(/^cookie:\s*/i, '').replace(/[\r\n]+/g, ' ').trim();
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cookie": cookie,
        "X-Requested-With": "XMLHttpRequest",
      };

      // 1. Get CSRF Token
      const tokenFetchUrl = lid ? `https://www.luogu.com.cn/article/${lid}/edit` : "https://www.luogu.com.cn/article/_new";
      const newResponse = await fetch(tokenFetchUrl, {
        headers: {
          ...headers,
          "Referer": "https://www.luogu.com.cn/article/mine",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      const html = await newResponse.text();
      let csrfToken = "";

      const patterns = [
        /<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']csrf-token["']/i,
        /"csrfToken"\s*:\s*"([^"]+)"/i,
        /"csrf-token"\s*:\s*"([^"]+)"/i,
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          csrfToken = match[1].trim();
          break;
        }
      }

      if (!csrfToken) {
        return res.status(500).json({ error: "Failed to extract CSRF token. The cookie might be invalid or expired.", details: html.substring(0, 200) });
      }

      // 1 = private, 2 = public
      let status = isPublic ? 2 : 1;

      const payload: any = {
        title: title,
        category: category || 1,
        content: content,
        solutionFor: solutionFor || null,
        status: status,
        top: top || 0,
      };
      
      // Submit edit API format requires LID in URL if updating
      const submitUrl = lid ? `https://www.luogu.com.cn/article/${lid}/editSubmit` : "https://www.luogu.com.cn/article/_newSubmit";

      // 2. Submit Article
      const submitResponse = await fetch(submitUrl, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Origin": "https://www.luogu.com.cn",
          "Referer": "https://www.luogu.com.cn/article/_new",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(payload)
      });

      const submitText = await submitResponse.text();
      let submitData;
      try {
        submitData = JSON.parse(submitText);
      } catch (e) {
        submitData = { raw: submitText.substring(0, 1000) };
      }

      if (!submitResponse.ok || submitData.errorMessage) {
         return res.status(500).json({ error: "Luogu API error", details: submitData });
      }
      
      const candidates = [
        submitData.lid,
        submitData.id,
        submitData.article?.lid,
        submitData.article?.id,
        submitData.data?.lid,
        submitData.data?.id
      ];

      for (const x of candidates) {
        if (x) {
          lid = String(x);
          break;
        }
      }

      if (!lid) {
        const redirectMatch = submitText.match(/\/article\/([A-Za-z0-9_-]+)/);
        if (redirectMatch && redirectMatch[1]) {
           lid = redirectMatch[1];
        }
      }

      res.json({ success: true, lid, url: lid ? `https://www.luogu.com.cn/article/${lid}` : null, rawResponse: submitData });

    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API router for importing from Luogu
  app.post("/api/luogu/import", async (req, res) => {
    try {
      let { cookie, lid } = req.body;

      if (!cookie || !lid) {
        return res.status(400).json({ error: "Cookie and LID required" });
      }

      
    cookie = cookie.replace(/^cookie:\s*/i, '').replace(/[\r\n]+/g, ' ').trim();
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cookie": cookie,
        "Referer": "https://www.luogu.com.cn/article/mine",
        "X-Requested-With": "XMLHttpRequest",
        "X-Lentille-Request": "content-only"
      };

      const response = await fetch(`https://www.luogu.com.cn/article/${lid}/edit`, { headers });
      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch article: ${response.statusText}`, statusCode: response.status });
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Fallback if not json
        const match = text.match(/window\._feInjection\s*=\s*JSON\.parse\(decodeURIComponent\("([^"]+)"\)\);/);
        if (match && match[1]) {
          data = JSON.parse(decodeURIComponent(match[1]));
        } else {
          return res.status(500).json({ error: "Could not parse response from Luogu." });
        }
      }

      const article = data.currentData?.article || data.data?.article || data.article;
      if (article && article.content) {
          let solutionFor = null;
          if (article.solutionFor) {
              if (typeof article.solutionFor === "object") {
                   solutionFor = article.solutionFor.pid;
              } else {
                   solutionFor = article.solutionFor;
              }
          }
          
          return res.json({ 
             success: true, 
             title: article.title, 
             content: article.content, 
             category: article.category,
             lid: article.lid,
             isPublic: article.status === 2,
             solutionFor: solutionFor,
             top: article.top || 0
          });
      }
      
      return res.status(500).json({ error: "Could not extract article content from Luogu. Please check if ID is correct and if you have permission.", details: data });

    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  const cnblogsRequest = async (url: string, cookie: string, passedXsrfToken: string | undefined, options: any = {}) => {
    let xsrfToken = passedXsrfToken;
    if (!xsrfToken) {
      const match = cookie.match(/(?:x-xsrf-token|xsrf-token)=([^;]+)/i);
      xsrfToken = match ? decodeURIComponent(match[1].trim().replace(/^"|"$/g, '')) : '';
      

    }
    
    cookie = cookie.replace(/^cookie:\s*/i, '').replace(/[\r\n]+/g, ' ').trim();
    const headers = {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "origin": "https://i.cnblogs.com",
      "referer": "https://i.cnblogs.com/posts/edit",
      "x-xsrf-token": xsrfToken,
      "x-requested-with": "XMLHttpRequest",
      "cookie": cookie,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      ...options.headers
    };
    
    const response = await fetch(`https://i.cnblogs.com${url}`, {
      ...options,
      headers
    });
    
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Cnblogs API error (${response.status}): ${text.substring(0, 1000)}`);
    }
    
    return await response.json();
  };

  app.post("/api/cnblogs/check", async (req, res) => {
    try {
      let { cookie } = req.body; const xsrfToken = '';
      if (!cookie) {
        return res.status(400).json({ error: "Missing required Cnblogs configuration" });
      }
      
      const collections = await cnblogsRequest("/api/collections", cookie, xsrfToken);
      res.json({ success: true, collections: collections?.items || [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to connect to Cnblogs API" });
    }
  });

  const parseFrontMatter = (markdown: string) => {
    let meta: Record<string, string> = {};
    let body = markdown;
    const lines = markdown.split('\n');
    
    if (lines[0] && lines[0].trim() === '---') {
      let endIndex = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          endIndex = i;
          break;
        }
      }
      if (endIndex !== -1) {
        for (let i = 1; i < endIndex; i++) {
          const line = lines[i];
          const colonIdx = line.indexOf(':');
          if (colonIdx !== -1) {
            const key = line.substring(0, colonIdx).trim().toLowerCase();
            const val = line.substring(colonIdx + 1).trim();
            meta[key] = val;
          }
        }
        body = lines.slice(endIndex + 1).join('\n').replace(/^\n+/, '');
      }
    }
    return { meta, body };
  };

  const parseList = (str: string) => {
    if (!str) return [];
    let clean = str.trim();
    if (clean.startsWith('[') && clean.endsWith(']')) {
      clean = clean.substring(1, clean.length - 1);
    }
    return clean.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  };

  app.post("/api/cnblogs/terms", async (req, res) => {
    try {
      let { cookie } = req.body; const xsrfToken = '';
      if (!cookie) {
        return res.status(400).json({ error: "Missing required Cnblogs configuration" });
      }
      
      // 1. Fetch Collections
      let collectionsData: any = { items: [] };
      try {
         collectionsData = await cnblogsRequest("/api/collections", cookie, xsrfToken);
         console.log("[cnblogs] res fetched collectionsData:", JSON.stringify(collectionsData).substring(0, 500));
      } catch (e) {
         console.error("Collections fetch failed", e);
      }
      
      let collectionsRaw = Array.isArray(collectionsData) ? collectionsData : (collectionsData?.items || []); 
      let collections = collectionsRaw.map((c: any) => ({
          title: c.title,
          id: c.id
      }));
      
      // 2. Fetch Tags
      let tagsData: any = [];
      try {
         tagsData = await cnblogsRequest("/api/tags/list?excludeInUsing=false&excludeUnUsing=false", cookie, xsrfToken);
      } catch (e) {
         console.error("Tags fetch failed", e);
      }
      let tags = tagsData.map((t: any) => ({ name: t.name, id: t.id }));
      
      res.json({ success: true, collections, tags });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to fetch terms" });
    }
  });

  app.post("/api/cnblogs/publish", async (req, res) => {
    try {
      let { cookie, title, content, isPublish, postId, collections, tags } = req.body; const xsrfToken = '';
      if (!cookie || !title || !content) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const { meta, body } = parseFrontMatter(content);
      
      let reqCols = parseList(collections || '');
      // If collection names passed, they will just be tracked or mapped to IDs by client.
      // But the python script expects collection IDs to be passed correctly. Let's assume the client passes collectionIds arrays.
      const collectionIds = req.body.collectionIds || [];
      const tagList = Array.from(new Set([...parseList(meta.tags || ''), ...parseList(tags || '')]));

      const payload = {
            id: postId ? parseInt(postId) : null,
            postType: 1,
            accessPermission: 0,
            title: meta.title ? meta.title.replace(/^['"]|['"]$/g, '') : title,
            url: null,
            postBody: body,
            categoryIds: null,
            categories: null,
            collectionIds: collectionIds,
            inSiteCandidate: false,
            inSiteHome: false,
            siteCategoryId: null,
            blogTeamIds: null,
            isPublished: isPublish,
            displayOnHomePage: isPublish,
            isAllowComments: true,
            includeInMainSyndication: isPublish,
            isPinned: false,
            showBodyWhenPinned: false,
            isOnlyForRegisterUser: false,
            isUpdateDateAdded: true,
            entryName: null,
            description: meta.description || meta.excerpt || null,
            featuredImage: null,
            tags: tagList.length > 0 ? tagList : null,
            password: null,
            publishAt: null,
            datePublished: new Date().toISOString(),
            dateUpdated: null,
            isMarkdown: true,
            isDraft: !isPublish,
            autoDesc: null,
            changePostType: false,
            blogId: 0,
            author: null,
            removeScript: false,
            clientInfo: null,
            changeCreatedTime: false,
            canChangeCreatedTime: false,
            isContributeToImpressiveBugActivity: false,
            usingEditorId: 5,
            sourceUrl: null
        };

      const result = await cnblogsRequest("/api/posts", cookie, xsrfToken, {
          method: "POST",
          body: JSON.stringify(payload)
      });
      
      res.json({ success: true, postId: result?.id || postId, result });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to publish to Cnblogs" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
