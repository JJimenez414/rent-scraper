from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
import os
from datetime import date, timedelta
from util.logger import get_logger

load_dotenv("../.env")

connection_pool = pool.SimpleConnectionPool(
	minconn=1,
	maxconn=10,
	host=os.getenv("DB_HOST", ""),
	database=os.getenv("DB_NAME", ""),
	user=os.getenv("DB_USER", ""),
	password=os.getenv("DB_PASSWORD", ""),
	port=int(os.getenv("DB_PORT", "")),
)

logger = get_logger("DATABASE")

def get_db_connection():
	return connection_pool.getconn()

def return_db_connection(conn):
	connection_pool.putconn(conn)

def db_insert_charges(results):
    logger.info("Entering db_insert_charges.")
    conn = get_db_connection()
    try:
        cur = conn.cursor()

        for row in results:
            entry_date, category, category_type, payer, amount, fee, balance = (
                row["date"],
                row["category"],
                row["category_type"],
                row["payer"],
                row["amount"],
                row["fee"],
                row["balance"],
            )

            formatted_category = category.replace("/", "").replace(" ", '%')

            logger.info("Adding the following entry to db: %s, %s, %s, %s, %s, %s, %s", entry_date, category_type, category, payer, amount, fee, balance)

            cur.execute(
                 "SELECT id FROM charge_categories WHERE name LIKE %s;", (formatted_category,)
            )

            category_id = cur.fetchone()[0]

            cur.execute(
                "INSERT INTO ledger_entries (entry_date, entry_type, category_id, payer, amount, fee, balance) VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (entry_date, category_id, payer, amount, balance) DO NOTHING;",
                (entry_date, category_type, category_id, payer, amount, fee, balance),
            )

            conn.commit()
    finally:
        logger.info("Exiting db_insert_charges.")
        return_db_connection(conn)


def db_get_month_charges(year, month):
    logger.info("Entering db_get_month_charges.")
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        start_date = date(year, month, 1)
        end_date = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
        
        logger.info("Getting data for the following month range: %s -> %s", start_date, end_date)

        cur.execute(
            """SELECT ledger_entries.id, ledger_entries.entry_date, ledger_entries.entry_type, charge_categories.name AS category, ledger_entries.payer, ledger_entries.amount, ledger_entries.fee, ledger_entries.balance
             FROM ledger_entries
             JOIN charge_categories ON charge_categories.id = ledger_entries.category_id
             WHERE entry_date >= %s AND entry_date < %s
             ORDER BY ledger_entries.entry_date DESC;
            """,
            (start_date, end_date),
        )

        entry_result = cur.fetchall()

        # Total of this month's charges (rent + utilities), excludes payments.
        cur.execute(
            """SELECT COALESCE(SUM(amount), 0) AS total
             FROM ledger_entries
             WHERE entry_type = 'charge' AND entry_date >= %s AND entry_date < %s;
            """,
            (start_date, end_date),
        )
        total_charges = cur.fetchone()["total"]

        # Charges are prepaid — the payment covering this month's charges is
        # dated in the prior month (e.g. Jul charges are settled by a
        # late-June payment). Grab the most recent payment before this
        # month started and compare it to this month's total.
        cur.execute(
            """SELECT entry_date, amount
             FROM ledger_entries
             WHERE entry_type = 'payment' AND entry_date < %s
             ORDER BY entry_date DESC
             LIMIT 1;
            """,
            (start_date,),
        )
        last_payment = cur.fetchone()

        is_paid = (
            last_payment is not None
            and abs(float(last_payment["amount"]) - float(total_charges)) < 0.01
        )

        return {
            "entries": entry_result,
            "total_charges": float(total_charges),
            "paid": is_paid,
            "paid_date": last_payment["entry_date"] if is_paid else None,
        }
    finally:
        logger.info("Exiting db_get_month_charges.")
        return_db_connection(conn)

def db_get_all_charges():
    logger.info("Entering db_get_all_charges.")
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT le.id, le.entry_date, le.entry_type, cc.name AS category,
                   le.payer, le.amount, le.fee, le.balance
            FROM ledger_entries le
            JOIN charge_categories cc ON cc.id = le.category_id
            ORDER BY le.entry_date DESC;
            """
        )
        return cur.fetchall()
    finally:
        logger.info("Exiting db_get_all_charges.")
        return_db_connection(conn)
        
def db_get_last_run():
    logger.info("Entering db_get_last_run.")
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM scrape_runs ORDER BY ran_at DESC LIMIT 1;")
        run = cur.fetchone()
        return (run['ran_at'], run['error_message'])
    finally: 
        logger.info("Exiting db_get_last_run.")
        return_db_connection(conn)

def db_insert_run(timestamp, status, error_message, num_rows):
    logger.info("Entering db_insert_run.")
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("INSERT INTO scrape_runs (ran_at, status, rows_scraped, error_message) VALUES (%s, %s, %s, %s);", (timestamp, status, num_rows, error_message))
        conn.commit()
    finally: 
        logger.info("Exiting get_db_connection.")
        return_db_connection(conn)
		
