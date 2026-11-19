export const config = {
  matcher: "/google0fb03484d5971d7.html",
};

export default function middleware() {
  return new Response("google-site-verification: google0fb03484d5971d7.html\n", {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
