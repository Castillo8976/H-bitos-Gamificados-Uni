'use strict';

const express = require('express');
const sequelize = require('../database');
const router = express.Router();

/** @implements RNF-06 */
router.get('/', async (_req, res, next) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ estado: 'ok', servicio: 'studyquest-api', base_datos: 'sqlite' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
