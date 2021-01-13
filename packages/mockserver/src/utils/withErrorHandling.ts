import express from 'express';

export default function(func: express.RequestHandler): express.RequestHandler {
  return async function (req, res, next) {
    try {
      return await func(req, res, next);
    } catch (e) {
      next(e);
    }
  }
}