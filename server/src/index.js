const { createServer } = require('./server')

const { app } = createServer()

const port = Number(process.env.PORT || 4000)
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`ScanMark API listening on http://localhost:${port}`)
})
