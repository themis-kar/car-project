#!/bin/bash -xe

dnf -y install postgresql17

wget https://truststore.pki.rds.amazonaws.com/eu-west-2/eu-west-2-bundle.pem
