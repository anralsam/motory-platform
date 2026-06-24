import os, http.server, socketserver
port = int(os.environ.get("PORT", "8099"))
os.chdir(os.path.dirname(os.path.abspath(__file__)))
with socketserver.TCPServer(("", port), http.server.SimpleHTTPRequestHandler) as httpd:
    httpd.serve_forever()
