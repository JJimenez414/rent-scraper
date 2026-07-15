from fastapi import FastAPI, APIRouter, Request, HTTPException, status, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from scraper.scrape import amli_scraper
from util.scraper_util import parse_ledger
from db import db_insert_charges, db_get_month_charges

import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origin=["http://localhost:5173", "http://rent.jmzfinance.com:5173", "https://rent.jmzfinance.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# endpoint to trigger job
@app.post("/trigger")
def trigger():
    # Run script, parse results, insert into db
    results = amli_scraper()
    data = parse_ledger(results)
    db_insert_charges(data)

    return {"status": "Data Successfully scraped and stored."}


# find charges for a specific month
@app.get("/charges/month")
def get_month_charges(month: int, year: int):
    print("hello world")
    return {"entries": db_get_month_charges(year, month)}



if __name__ == "__main__":
	uvicorn.run(app, host="0.0.0.0", port=8081, access_log=False)
