#!/bin/bash
gunicorn --workers 4 --bind 0.0.0.0:10000 src.main:app

