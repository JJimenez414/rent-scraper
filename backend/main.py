from fastapi import FastAPI, APIRouter, Request, HTTPException, status, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from scraper.scrape import amli_scraper
from util.scraper_util import parse_ledger
from db import db_insert_charges, db_get_month_charges, db_insert_run, db_get_last_run, db_get_all_charges
from util.logger import get_logger 
from datetime import datetime

import uvicorn

app = FastAPI()
logger = get_logger("MAIN")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://rent.jmzfinance.com:5173", "https://rent.jmzfinance.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# endpoint to trigger job
@app.post("/trigger")
def trigger():

    logger.info("POST /trigger: Entering endpoint")

    start_time_stamp = datetime.now().replace(microsecond=0)
    print(start_time_stamp)
    # Run script, parse results, insert into db
    results, num_rows = amli_scraper()

    if results is None and len(results) <= 0:
         logger.warning("Results is none/empty")

    data = parse_ledger(results)
    if data is None and len(results) <= 0:
         logger.warning("Data is none/empty")

    db_insert_charges(data)

    db_insert_run(start_time_stamp, 'success', "Data Successfully scraped and stored.", num_rows)
    logger.info("POST /trigger: Exiting endpoint")

    return {"status": "Data Successfully scraped and stored.", "timestamp": start_time_stamp}


# find charges for a specific month
@app.get("/charges/month")
def get_month_charges(month: int, year: int):
    logger.info("GET /charges/month: Entering endpoint")
    result_db = db_get_month_charges(year, month)
    logger.info("GET /charges/month: Exiting endpoint")
    return {"entries": result_db}

# find charges for a specific month
@app.get("/charges/all")
def get_month_charges():
    logger.info("GET /charges/all: Entering endpoint")
    result_db = db_get_all_charges()
    logger.info("GET /charges/all: Exiting endpoint")
    return {"entries": result_db}

# get las run data
@app.get("/run")
def get_last_run():
    timestamp, message = db_get_last_run()
    return {"status": message, "timestamp": timestamp}



if __name__ == "__main__":
	uvicorn.run(app, host="0.0.0.0", port=8081, access_log=False)
