const OWNER = "srijapramanik";
const REPO = "srijapramanik.github.io";
const FILE = "data/site-pages.json";

function headers(token) {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };
}

function validPage(p) {
  return p === "home" || p === "links" || p === "tools";
}

async function getStore(token) {
  const r = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + FILE, {
    headers: headers(token)
  });
  if (r.status === 404) return { data: {}, sha: null };
  if (!r.ok) throw new Error("GitHub read failed: " + r.status);
  const j = await r.json();
  const raw = Buffer.from(j.content.replace(/\n/g, ""), "base64").toString("utf8");
  return { data: JSON.parse(raw || "{}"), sha: j.sha };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ ok: false, error: "GITHUB_TOKEN is not configured" });

  const page = (req.query && req.query.page) || "home";
  if (!validPage(page)) return res.status(400).json({ ok: false, error: "Invalid page" });

  try {
    if (req.method === "GET") {
      const store = await getStore(token);
      return res.status(200).json({ ok: true, page, html: store.data[page] || "" });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const html = String(body.html || "");
      if (!html) return res.status(400).json({ ok: false, error: "Empty page" });
      if (html.length > 850000) return res.status(413).json({ ok: false, error: "Page is too large" });

      const store = await getStore(token);
      store.data[page] = html;
      const content = Buffer.from(JSON.stringify(store.data, null, 2), "utf8").toString("base64");

      const payload = {
        message: "Save " + page + " page from SRIJA Visual Editor",
        content,
        branch: "main"
      };
      if (store.sha) payload.sha = store.sha;

      const r = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + FILE, {
        method: "PUT",
        headers: headers(token),
        body: JSON.stringify(payload)
      });
      if (!r.ok) {
        const detail = await r.text();
        throw new Error("GitHub write failed: " + r.status + " " + detail.slice(0, 300));
      }
      return res.status(200).json({ ok: true, page });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Save failed" });
  }
};