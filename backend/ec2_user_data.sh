#!/bin/bash -xe

REGION=$1
cd /home/ec2-user
mkdir car-app-2025
cd car-app-2025
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install Flask gunicorn
wget --https-only --retry-connrefused --waitretry=1 \
    --tries=3 --timeout=15 -O /home/ec2-user/car-app-2025/app.py https://raw.githubusercontent.com/themis-kar/car-project/refs/heads/main/backend/app.py
wget --https-only --retry-connrefused --waitretry=1 \
    --tries=3 --timeout=15 -O /home/ec2-user/car-app-2025/rds_cert.pem https://truststore.pki.rds.amazonaws.com/${REGION}/${REGION}-bundle.pem