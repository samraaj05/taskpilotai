require('dotenv').config();
const logger = require('./src/utils/logger');
logger.info(`ENV LOADED: ${!!process.env.SMTP_USER}`);

const isProduction = process.env.NODE_ENV === 'production';
// Cold Start Optimization: Preload essential modules
const path = require('path');
const http = require('http');
const mongoose = require('mongoose');

logger.info(`DISABLE_EMAIL VALUE: ${process.env.DISABLE_EMAIL}`);
logger.info(`JWT_SECRET loaded: ${!!process.env.JWT_SECRET}`);

const express = require('express');
