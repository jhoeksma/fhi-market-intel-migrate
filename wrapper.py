import http.server
import os
import traceback

import migrate
import check_db

PORT = int(os.environ.get("PORT", 8080))

_migrate_state = {"ran": False, "result": None}


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/migrate"):
            force = "force=1" in self.path
            if _migrate_state["ran"] and not force:
                body = ("ALREADY RAN in this process — refusing to re-run and duplicate rows "
                        "(supplier_revenue/source/national_programme have no unique constraint).\n"
                        "Append ?force=1 to re-run anyway.\n\n--- PREVIOUS RESULT ---\n"
                        + (_migrate_state["result"] or ""))
            else:
                body = self._safe(migrate.run)
                _migrate_state["ran"] = True
                _migrate_state["result"] = body
        elif self.path.startswith("/check"):
            body = self._safe(check_db.run)
        else:
            body = "OK - alive. GET /check to inspect DB state, /migrate to run the migration."
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(body.encode("utf-8", errors="replace"))

    def _safe(self, fn):
        try:
            return fn()
        except Exception:
            return "EXCEPTION:\n" + traceback.format_exc()

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    with http.server.HTTPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"listening on {PORT}", flush=True)
        httpd.serve_forever()
