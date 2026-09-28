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
      },
    },
  },
});
