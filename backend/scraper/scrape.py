import os
import csv
from dotenv import load_dotenv, find_dotenv
from playwright.sync_api import sync_playwright
from util.logger import get_logger

load_dotenv(find_dotenv())

USER = os.getenv("SCRAPE_USER", "")
PASSWORD = os.getenv("SCRAPE_PASS", "")
BASE_URL = os.getenv("BASE_URL", "")

logger = get_logger("SCRAPER")

if not USER or not PASSWORD or not BASE_URL:
    raise SystemExit("Set USER, PASSWORD, and BASE_URL environment variables.")

def amli_scraper():

    logger.info("Running scraper for AMLI")

    with sync_playwright() as p:
        logger.info("Launching chromium browser")
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = browser.new_page()

        # Log in
        logger.info(f"Navigating to login page... {BASE_URL}/auth")
        page.goto(f"{BASE_URL}/auth")
        page.wait_for_load_state("networkidle")

        logger.info("Filling credentials")
        page.get_by_label("Email", exact=False).fill(USER)
        page.get_by_label("Password", exact=False).fill(PASSWORD)
        page.get_by_role("button", name="Log In").click()

        logger.info(f"Waiting for login to complete...")
        page.wait_for_url(lambda url: "/auth" not in url, timeout=15000)
        logger.info(f"Landed on: {page.url}")

        # Navigate to payments
        logger.info(f"Looking for payment history...")
        page.wait_for_load_state("networkidle")

        # Try clicking a Payments link in the nav
        payments_link = page.get_by_role("link", name="Payment").first
        if payments_link.is_visible():
            payments_link.click()
            page.wait_for_load_state("networkidle")
        else:
            page.goto(f"{BASE_URL}/app/payments/ledger")
            page.wait_for_load_state("networkidle")

        logger.info(f"On page: {page.url}")

        # Scroll until no new rows load
        page.wait_for_timeout(2000)
        logger.info(f"Scrolling to load all transactions...")
        while True:
            before = page.locator("table tbody tr").count()
            page.locator("table tbody tr").last.scroll_into_view_if_needed()
            page.wait_for_timeout(1500)
            after = page.locator("table tbody tr").count()
            logger.info(f"rows: {before} → {after}")
            if after == before:
                break

        rows = page.locator("table tbody tr").all()
        logger.info(f"Total rows: {len(rows)}")


        payments = []
        for row in rows:
            cells = [cell.inner_text().strip() for cell in row.locator("td").all()]
            if cells:
                payments.append(cells)

        logger.info("Scraper finished")
        
        return payments

