"""Local development server for the booking page.

Same as `python -m http.server`, but every response carries
`Cache-Control: no-store`, so browser caches can never serve stale modules
while you edit. Run from the project root:

    python serve.py            # http://127.0.0.1:8765
"""
import http.server
import sys

PORT = 8765


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), NoCacheHandler)
    print(f"Serving on http://127.0.0.1:{PORT} (no-store caching)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    sys.exit(main())
