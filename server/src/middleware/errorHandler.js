// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  // eslint-disable-next-line no-console
  console.error(err)

  const status = err.status || 500
  const message = err.message || 'Server error'
  res.status(status).json({ error: message })
}

module.exports = { errorHandler }
