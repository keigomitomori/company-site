// 本番では静的アセットに一致しなかったリクエストだけを処理する Worker。
// assets.html_handling を "none" にして /about.html を転送させない代わりに、
// GitHub Pages と同じディレクトリURLの解決と 404 応答をここで補う。
// （本番の /about.html 等の実ファイルは Worker を通らずアセットとして直接返る）
//
// プレビュー環境（wrangler.jsonc の env.preview）は run_worker_first で全リクエストを受け、
// 検索エンジンに載らないよう X-Robots-Tag: noindex を付ける。

/**
 * @typedef {{ ASSETS: { fetch: typeof fetch }, NOINDEX?: string }} Env
 */

/** @param {string} pathname */
const hasExtension = (pathname) => /\.[^/]+$/.test(pathname);

/**
 * @param {Request} request
 * @param {Env} env
 */
async function route(request, env) {
  const url = new URL(request.url);

  // プレビューは全リクエストがここを通るので、まずアセットをそのまま探す
  if (env.NOINDEX === '1') {
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
  }

  if (request.method === 'GET' || request.method === 'HEAD') {
    // /articles/ → /articles/index.html を返す
    if (url.pathname.endsWith('/')) {
      const index = await env.ASSETS.fetch(new URL(`${url.pathname}index.html`, url), request);
      if (index.ok || index.status === 304) return index;
    } else if (!hasExtension(url.pathname)) {
      // /it-support → /it-support/ へ恒久転送（GitHub Pages と同じ）
      const index = await env.ASSETS.fetch(new URL(`${url.pathname}/index.html`, url), { method: 'HEAD' });
      if (index.ok) {
        url.pathname = `${url.pathname}/`;
        return Response.redirect(url.toString(), 301);
      }
      // /about → /about.html へ恒久転送。GitHub Pages は /about でも about.html を返していたため、
      // 外部からの拡張子なしリンクを切らずに canonical の URL へ寄せる
      const page = await env.ASSETS.fetch(new URL(`${url.pathname}.html`, url), { method: 'HEAD' });
      if (page.ok) {
        url.pathname = `${url.pathname}.html`;
        return Response.redirect(url.toString(), 301);
      }
    }
  }

  const notFound = await env.ASSETS.fetch(new URL('/404.html', url));
  return new Response(request.method === 'HEAD' ? null : notFound.body, {
    status: 404,
    headers: notFound.headers,
  });
}

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   */
  async fetch(request, env) {
    const response = await route(request, env);
    if (env.NOINDEX !== '1') return response;
    const marked = new Response(response.body, response);
    marked.headers.set('X-Robots-Tag', 'noindex');
    return marked;
  },
};
