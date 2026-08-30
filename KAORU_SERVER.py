from __future__ import annotations

import http.server
import os
import pathlib
import threading
import time
import webbrowser

ROOT = pathlib.Path(__file__).resolve().parent
os.chdir(ROOT)

class KaoruHandler(http.server.SimpleHTTPRequestHandler):
    """Servidor local de Kaoru's Studio sin caché para evitar cargar builds viejos."""
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        print("[Kaoru] " + (fmt % args))

server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), KaoruHandler)
port = int(server.server_address[1])
url = f"http://127.0.0.1:{port}/?build=14.2-{int(time.time())}#silhouette"

print("=" * 62)
print(" KAORU'S STUDIO — servidor local")
print(f" Carpeta: {ROOT}")
print(f" Puerto libre asignado: {port}")
print(" No cierres esta ventana mientras uses Kaoru's Studio.")
print("=" * 62)

# El servidor ya está enlazado al puerto cuando se abre el navegador.
threading.Timer(0.45, lambda: webbrowser.open(url, new=2)).start()

try:
    server.serve_forever(poll_interval=0.25)
except KeyboardInterrupt:
    print("\nCerrando Kaoru's Studio...")
finally:
    server.server_close()
