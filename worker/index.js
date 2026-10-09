// 静的アセットに一致しなかったリクエストだけを処理する Worker。
// assets.html_handling を "none" にして /about.html を転送させない代わりに、
// GitHub Pages と同じディレクトリURLの解決と 404 応答をここで補う。
// （/about.html 等の実ファイルは Worker を通らずアセットとして直接返る）

/** @param {string} pathname */
const hasExtension = (pathname) => /\.[^/]+$/.test(pathname);

export default {
  /**
   * @param {Request} request
   * @param {{ ASSETS: { fetch: typeof fetch } }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);

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
  },
};
