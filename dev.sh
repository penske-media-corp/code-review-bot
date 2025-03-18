#!/bin/bash

nodemon --watch build build/server.js &
npm start --prefix client &
