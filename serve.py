"""Local dev server with caching disabled. Run: python serve.py  ->  http://localhost:5173"""
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        # Serve the site's own 404 page for missing files, like Netlify does
        page = os.path.join(os.path.dirname(os.path.abspath(__file__)), "404.html")
        if code == 404 and os.path.exists(page):
            body = open(page, "rb").read()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)


if __name__ == "__main__":
    ThreadingHTTPServer.allow_reuse_address = True
    port = int(os.environ.get("PORT", 5173))
    httpd = ThreadingHTTPServer(("", port), NoCache)
    print(f"Serving on http://localhost:{port}")
    httpd.serve_forever()
