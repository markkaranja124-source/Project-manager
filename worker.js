/**
 * Cloudflare Worker Entrypoint
 * - Serves Static Assets (HTML, CSS, JS, Manifest, Service Worker)
 * - Proxies /api/* requests to BACKEND_URL (if configured in Cloudflare environment variables)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. API Requests Handling
    if (url.pathname.startsWith('/api/')) {
      if (env.BACKEND_URL) {
        try {
          const backendBase = env.BACKEND_URL.replace(/\/+$/, '');
          const targetUrl = new URL(url.pathname + url.search, backendBase);

          // Clone and forward request
          const modifiedHeaders = new Headers(request.headers);
          modifiedHeaders.set('x-forwarded-host', url.host);
          modifiedHeaders.set('x-forwarded-proto', url.protocol.replace(':', ''));

          const proxyRequest = new Request(targetUrl, {
            method: request.method,
            headers: modifiedHeaders,
            body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
            redirect: 'follow'
          });

          return await fetch(proxyRequest);
        } catch (err) {
          return new Response(JSON.stringify({
            success: false,
            error: 'BackendProxyError',
            message: 'Failed to communicate with configured backend server: ' + err.message
          }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // If BACKEND_URL is not set yet
      return new Response(JSON.stringify({
        success: false,
        error: 'BackendNotConfigured',
        message: 'The frontend is live on Cloudflare Workers! To connect authentication and MySQL database, configure BACKEND_URL in your Cloudflare Worker Settings or connect via Cloudflare Tunnel.'
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 2. Static Assets Serving
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Asset binding not available', { status: 500 });
  }
};
