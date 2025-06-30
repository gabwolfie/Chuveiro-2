#!/bin/bash
<<<<<<< HEAD
cd "$(dirname "$0")"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
gunicorn --workers 4 --bind 0.0.0.0:5000 src.main:app
=======
gunicorn --workers 4 --bind 0.0.0.0:10000 src.main:app

>>>>>>> 26a91727f4676f115449e1c39c2e004c90d2fd83
