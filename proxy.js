export default function proxy() {
  return new Response("google-site-verification: google0fb03484d5971d7.html\n", {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
