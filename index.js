const fs = require('fs')
const path = require('path')
const express = require('express')
const app = express()
const httpolyglot = require('httpolyglot')

const options = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem'), 'utf-8'),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem'), 'utf-8')
}

const port = 5500

app.use(express.static(path.join(__dirname, 'public')))

const httpsServer = httpolyglot.createServer(options, app)
const io = require('socket.io')(httpsServer)

const peers = {}

io.on('connect', (socket) => {
  console.log('client connected')

  Object.values(peers).forEach((peer) => peer.emit('initReceive', socket.id))
  peers[socket.id] = socket

  socket.on('signal', (data) => {
    console.log('sending signal from ' + socket.id + ' to ', data)
    if (peers[data.socket_id]) {
      peers[data.socket_id].emit('signal', {
        socket_id: socket.id,
        signal: data.signal
      })
    }
  })

  socket.on('disconnect', () => {
    console.log('socket disconnected ' + socket.id)
    socket.broadcast.emit('removePeer', socket.id)
    delete peers[socket.id]
  })

  socket.on('initSend', socket_id => {
    console.log('INIT SEND by ' + socket.id + ' for ' + socket_id)
    peers[socket_id].emit('initSend', socket.id)
  })
})


httpsServer.listen(port, () => {
  console.log(`listening on port ${port}`)
})

