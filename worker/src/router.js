const routes = [];

export function register(method, pattern, handler) {
  routes.push({
    method: method.toUpperCase(),
    parts: pattern.split("/").filter(Boolean),
    handler,
  });
}

export function matchRoute(method, pathname) {
  const parts = pathname.split("/").filter(Boolean);
  for (const route of routes) {
    if (route.method !== method && !(route.method === "GET" && method === "HEAD")) {
      continue;
    }
    if (route.parts.length !== parts.length) {
      continue;
    }
    const params = {};
    let matched = true;
    for (let i = 0; i < parts.length; i += 1) {
      const routePart = route.parts[i];
      if (routePart.startsWith(":")) {
        params[routePart.slice(1)] = decodeURIComponent(parts[i]);
      } else if (routePart !== parts[i]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return { handler: route.handler, params };
    }
  }
  return null;
}

export function routeCount() {
  return routes.length;
}
