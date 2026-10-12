import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

const prettyMap = {
  "/sasa-cioringa": "/sasa-cioringa.html",
  "/founder": "/sasa-cioringa.html",
  "/blog": "/blog.html",
  "/insights": "/blog.html",
  "/blog/conferinta-presa-novi-sad-2017": "/blog/conferinta-presa-novi-sad-2017.html",
  "/blog/centru-rd-novi-sad-2018": "/blog/centru-rd-novi-sad-2018.html",
  "/blog/forum-auto-budapesta-2019": "/blog/forum-auto-budapesta-2019.html",
  "/blog/see-automotive-connect-supply-2020": "/blog/see-automotive-connect-supply-2020.html",
  "/blog/fabrica-electronica-novi-sad-2021": "/blog/fabrica-electronica-novi-sad-2021.html",
  "/blog/timisoara-competitiva-2040": "/blog/timisoara-competitiva-2040.html",
};

function prettyRoutes() {
  const rewrite = (req, _res, next) => {
    const [path, query] = (req.url || "/").split("?");
    const mapped = prettyMap[path];
    if (mapped) {
      req.url = query ? `${mapped}?${query}` : mapped;
    }
    next();
  };

  return {
    name: "pretty-routes",
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig({
  plugins: [prettyRoutes()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        founder: resolve(root, "sasa-cioringa.html"),
        blog: resolve(root, "blog.html"),
        article2017: resolve(root, "blog/conferinta-presa-novi-sad-2017.html"),
        article2018: resolve(root, "blog/centru-rd-novi-sad-2018.html"),
        article2019: resolve(root, "blog/forum-auto-budapesta-2019.html"),
        article2020: resolve(root, "blog/see-automotive-connect-supply-2020.html"),
        article2021: resolve(root, "blog/fabrica-electronica-novi-sad-2021.html"),
        article2026: resolve(root, "blog/timisoara-competitiva-2040.html"),
      },
    },
  },
});
