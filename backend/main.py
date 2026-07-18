from fastapi import FastAPI, APIRouter, Request, HTTPException, status, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from scraper.scrape import amli_scraper
from util.scraper_util import parse_ledger
from db import db_insert_charges, db_get_month_charges
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
    # # Run script, parse results, insert into db
    # results = amli_scraper()

    # if results is None and len(results) <= 0:
    #      logger.warning("Results is none/empty")

    # data = parse_ledger(results)
    # if data is None and len(results) <= 0:
    #      logger.warning("Data is none/empty")

    # db_insert_charges(data)

    logger.info("POST /trigger: Exiting endpoint")

    return {"status": "Data Successfully scraped and stored.", "timestamp": start_time_stamp}


# find charges for a specific month
@app.get("/charges/month")
def get_month_charges(month: int, year: int):
    return {"entries": db_get_month_charges(year, month)}



if __name__ == "__main__":
	uvicorn.run(app, host="0.0.0.0", port=8081, access_log=False)
