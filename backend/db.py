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
        return cur.fetchall()
    finally:
        logger.info("Exiting db_get_month_charges.")
        return_db_connection(conn)
		