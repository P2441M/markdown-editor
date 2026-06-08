interface Env {
  // bindings if any
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Help parsing functions
function parseFrontMatter(markdown: string) {
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
}

function parseList(str: string): string[] {
  if (!str) return [];
  let clean = str.trim();
  if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.substring(1, clean.length - 1);
  }
  return clean.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

// Cnblogs helper
async function cnblogsRequest(url: string, cookie: string, passedXsrfToken: string | undefined, options: any = {}) {
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
    "x-xsrf-token": xsrfToken || '',
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
}

// Luogu Publish handler
async function handleLuoguPublish(reqData: any) {
  let { cookie, title, content, category, lid, solutionFor, isPublic, top } = reqData;

  if (!cookie) {
    return new Response(JSON.stringify({ error: "No cookie provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  cookie = cookie.replace(/^cookie:\s*/i, '').replace(/[\r\n]+/g, ' ').trim();
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cookie": cookie,
    "X-Requested-With": "XMLHttpRequest",
  };

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
    return new Response(JSON.stringify({ error: "Failed to extract CSRF token. The cookie might be invalid or expired.", details: html.substring(0, 200) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
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

  const submitUrl = lid ? `https://www.luogu.com.cn/article/${lid}/editSubmit` : "https://www.luogu.com.cn/article/_newSubmit";

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
  let submitData: any;
  try {
    submitData = JSON.parse(submitText);
  } catch (e) {
    submitData = { raw: submitText.substring(0, 1000) };
  }

  if (!submitResponse.ok || submitData.errorMessage) {
    return new Response(JSON.stringify({ error: "Luogu API error", details: submitData }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
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

  return new Response(JSON.stringify({ success: true, lid, url: lid ? `https://www.luogu.com.cn/article/${lid}` : null, rawResponse: submitData }), {
    headers: { "Content-Type": "application/json" }
  });
}

// Luogu Import handler
async function handleLuoguImport(reqData: any) {
  let { cookie, lid } = reqData;

  if (!cookie || !lid) {
    return new Response(JSON.stringify({ error: "Cookie and LID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
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
    return new Response(JSON.stringify({ error: `Failed to fetch article: ${response.statusText}`, statusCode: response.status }), {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  }

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    const match = text.match(/window\._feInjection\s*=\s*JSON\.parse\(decodeURIComponent\("([^"]+)"\)\);/);
    if (match && match[1]) {
      data = JSON.parse(decodeURIComponent(match[1]));
    } else {
      return new Response(JSON.stringify({ error: "Could not parse response from Luogu." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
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

    return new Response(JSON.stringify({
      success: true,
      title: article.title,
      content: article.content,
      category: article.category,
      lid: article.lid,
      isPublic: article.status === 2,
      solutionFor: solutionFor,
      top: article.top || 0
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ error: "Could not extract article content from Luogu. Please check if ID is correct and if you have permission.", details: data }), {
    status: 500,
    headers: { "Content-Type": "application/json" }
  });
}

// Cnblogs Check handler
async function handleCnblogsCheck(reqData: any) {
  let { cookie } = reqData;
  if (!cookie) {
    return new Response(JSON.stringify({ error: "Missing required Cnblogs configuration" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const collections = await cnblogsRequest("/api/collections", cookie, undefined);
  return new Response(JSON.stringify({ success: true, collections: collections?.items || [] }), {
    headers: { "Content-Type": "application/json" }
  });
}

// Cnblogs Terms handler
async function handleCnblogsTerms(reqData: any) {
  let { cookie } = reqData;
  if (!cookie) {
    return new Response(JSON.stringify({ error: "Missing required Cnblogs configuration" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  let collectionsData: any = { items: [] };
  try {
    collectionsData = await cnblogsRequest("/api/collections", cookie, undefined);
  } catch (e) {
    console.error("Collections fetch failed", e);
  }

  let collectionsRaw = Array.isArray(collectionsData) ? collectionsData : (collectionsData?.items || []);
  let collections = collectionsRaw.map((c: any) => ({
    title: c.title,
    id: c.id
  }));

  let tagsData: any = [];
  try {
    tagsData = await cnblogsRequest("/api/tags/list?excludeInUsing=false&excludeUnUsing=false", cookie, undefined);
  } catch (e) {
    console.error("Tags fetch failed", e);
  }
  let tags = tagsData.map((t: any) => ({ name: t.name, id: t.id }));

  return new Response(JSON.stringify({ success: true, collections, tags }), {
    headers: { "Content-Type": "application/json" }
  });
}

// Cnblogs Publish handler
async function handleCnblogsPublish(reqData: any) {
  let { cookie, title, content, isPublish, postId, collections, tags } = reqData;
  if (!cookie || !title || !content) {
    return new Response(JSON.stringify({ error: "Missing required parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { meta, body } = parseFrontMatter(content);

  const collectionIds = reqData.collectionIds || [];
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

  const result = await cnblogsRequest("/api/posts", cookie, undefined, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return new Response(JSON.stringify({ success: true, postId: result?.id || postId, result }), {
    headers: { "Content-Type": "application/json" }
  });
}

// Router entry point
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle options preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS
    });
  }

  try {
    let reqData: any = {};
    if (request.method === "POST") {
      reqData = await request.json();
    }

    let response: Response;

    switch (path) {
      case "/api/luogu/publish":
        response = await handleLuoguPublish(reqData);
        break;
      case "/api/luogu/import":
        response = await handleLuoguImport(reqData);
        break;
      case "/api/cnblogs/check":
        response = await handleCnblogsCheck(reqData);
        break;
      case "/api/cnblogs/terms":
        response = await handleCnblogsTerms(reqData);
        break;
      case "/api/cnblogs/publish":
        response = await handleCnblogsPublish(reqData);
        break;
      default:
        response = new Response(JSON.stringify({ error: "Not Found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
    }

    // Attach CORS headers if needed (for Pages testing, though relative requests don't need them)
    const finalHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      finalHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: finalHeaders
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Something went wrong" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS
      }
    });
  }
};
