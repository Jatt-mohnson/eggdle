#!/usr/bin/env python3
# Dev static server that disables caching, so every refresh loads fresh module files.
# Port defaults to 8001; override with `python3 serve.py <port>` or the PORT env var.
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1] if len(sys.argv) > 1 else os.environ.get("PORT", 8001))
    print(f"Serving on http://localhost:{port}  (Ctrl-C to stop)")
    HTTPServer(("", port), NoCacheHandler).serve_forever()
