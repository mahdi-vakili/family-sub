import styles from "./styles.css";
import "./routes/index.js";
import { createContext, HttpError } from "./context.js";
import { COOKIE_NAME, serializeCookie } from "./http.js";
import { ensureDatabase } from "./init.js";
import { matchRoute } from "./router.js";
import { serializeSession } from "./session.js";
import { fetchAllSubscriptionLinks } from "./subscriptions.js";
import { renderError } from "./views/layout.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/static/styles.css") {
      return new Response(styles, {
        headers: {
          "Content-Type": "text/css; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    let context = null;
    try {
      await ensureDatabase(env);
      context = await createContext(request, env);
      const route = matchRoute(request.method, url.pathname);
      const result = route
        ? await route.handler(context, route.params)
        : renderError(
            context,
            "Page Not Found",
            "The page you requested does not exist.",
            404,
          );
      return await finalize(context, request.method, result, env);
    } catch (error) {
      context = context || (await createContext(request, env));
      const result =
        error instanceof HttpError
          ? renderError(context, error.title, error.message, error.status)
          : renderError(
              context,
              "Server Error",
              "Something went wrong. Please try again.",
              500,
            );
      return await finalize(context, request.method, result, env);
    }
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(fetchAllSubscriptionLinks(env));
  },
};

async function finalize(context, method, result, env) {
  const headers = new Headers(result.headers || {});
  if (result.contentType && !headers.has("Content-Type")) {
    headers.set("Content-Type", result.contentType);
  }
  if (context.dirty) {
    const token = await serializeSession(context.session, env.SECRET_KEY);
    headers.append(
      "Set-Cookie",
      serializeCookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: (env.SESSION_COOKIE_SECURE ?? "1") !== "0",
        sameSite: "Lax",
        path: "/",
      }),
    );
  }
  const body = method === "HEAD" ? "" : (result.body ?? "");
  return new Response(body, { status: result.status || 200, headers });
}
