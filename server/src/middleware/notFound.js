function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' })
}

module.exports = { notFound }
