from http.server import HTTPServer, BaseHTTPRequestHandler

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        print(f"[SERVER {PORT}] Connection received: {self.client_address} requested {self.path}")
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

    # Optional: to suppress default access logs
    def log_message(self, format, *args):
        return

if __name__ == "__main__":
    import sys

    # You pass the PORT as the first CLI argument
    PORT = int(sys.argv[1])
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    print(f"Server started on port {PORT}")
    server.serve_forever()
