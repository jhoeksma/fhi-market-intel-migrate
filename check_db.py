import os
import psycopg2


def run():
    output = []
    def log(*a):
        line = " ".join(str(x) for x in a)
        output.append(line)
        print(line, flush=True)

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute("SELECT table_schema, table_name FROM information_schema.tables "
                "WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1,2;")
    tables = cur.fetchall()
    log("TABLES:", tables)
    for schema, t in tables:
        cur.execute('SELECT count(*) FROM "%s"."%s"' % (schema, t))
        log(f"{schema}.{t} -> {cur.fetchone()[0]}")
    conn.close()
    log("CHECK COMPLETE")
    return "\n".join(output)


if __name__ == "__main__":
    run()
