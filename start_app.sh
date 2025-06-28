#!/bin/bash
cd "$(dirname "$0")"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
gunicorn --workers 4 --bind 127.0.0.1:5000 src.main:app
