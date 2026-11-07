
const main = require('../dist/main.js');

const appHandler = main.default || main;

async function handler(req, res) {
  try {
    if (typeof appHandler !== 'function') {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');

      return res.end(
        JSON.stringify({
          error: 'HANDLER_NOT_FOUND',
          message: 'No se encontró el handler de NestJS en dist/main.js',
          mainType: typeof main,
          defaultType: typeof main.default,
        }),
      );
    }

    return await appHandler(req, res);
  } catch (err) {
    console.error('Serverless handler runtime error:', err);

    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');

    return res.end(
      JSON.stringify({
        error: 'SERVERLESS_RUNTIME_ERROR',
        message: 'Error al ejecutar el backend.',
        details: String(err?.message || err),
      }),
    );
  }
}

module.exports = handler;
module.exports.default = handler;
