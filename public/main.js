let socket = null
let localStream = null
let audioStream = null
const peers = {}
const video = document.getElementById('local')
const videos = document.getElementById('videos')

const constraints = {
  audio: true,
  video: {
    "aspectRatio": 1.7777777777777777,
    "cursor": "always",
    "frameRate": 30,
    "height": 900,
    "logicalSurface": true,
    "resizeMode": "crop-and-scale",
    "width": 1600
  }
}

/*
const configuration = {
  "iceServers": [
    {
      url: "stun.l.google.com:19302"
    }
  ]
}
*/

const audioConstraints = {
  audio: {
    audioGainControl: false,
    volume: 1.0,
    echoCancellation: false,
    autoGainControl: false,
    noiseSuppression: false,
  },
  video: false,
}

navigator.mediaDevices.getUserMedia(audioConstraints).then(audio => {
  navigator.mediaDevices.getDisplayMedia(constraints).then((stream) => {
    localStream = stream
    // audioStream = audio
    const audioContext = new AudioContext()
    const gainNode = audioContext.createGain()
    const audioSource = audioContext.createMediaStreamSource(audio)
    const audioDestination = audioContext.createMediaStreamDestination()
    audioSource.connect(gainNode)
    gainNode.connect(audioDestination)
    gainNode.gain.value = 10
    audioStream = audioDestination.stream
    video.srcObject = stream;
    video.play()
    init()
  })
}).catch(() => {
  navigator.mediaDevices.getDisplayMedia(constraints).then((stream) => {
    localStream = stream
    video.srcObject = stream;
    video.play()
    init()
  })
})


function init() {
  socket = io()

  socket.on('initReceive', socket_id => {
    console.log('INIT RECEIVE ' + socket_id)
    addPeer(socket_id, false)

    socket.emit('initSend', socket_id)
  })

  socket.on('initSend', socket_id => {
    console.log('INIT SEND ' + socket_id)
    addPeer(socket_id, true)
  })

  socket.on('removePeer', socket_id => {
    console.log('removing peer ' + socket_id)
    removePeer(socket_id)
  })

  socket.on('disconnect', () => {
    console.log('GOT DISCONNECTED')
    for (let socket_id in peers) {
      removePeer(socket_id)
    }
  })

  socket.on('signal', data => {
    peers[data.socket_id].signal(data.signal)
  })
}

function removePeer(socket_id) {

  let videoEl = document.getElementById(socket_id)
  if (videoEl) {

    const tracks = videoEl.srcObject.getTracks();

    tracks.forEach(function (track) {
      track.stop()
    })

    videoEl.srcObject = null
    videoEl.parentNode.removeChild(videoEl)
  }
  if (peers[socket_id]) peers[socket_id].destroy()
  delete peers[socket_id]
}

function addPeer(socket_id, am_initiator) {
  const streams = [localStream]
  if (audioStream) {
    streams.push(audioStream)
  }
  peers[socket_id] = new SimplePeer({
    initiator: am_initiator,
    streams,
    config: configuration
  })

  peers[socket_id].on('signal', data => {
    socket.emit('signal', {
      signal: data,
      socket_id: socket_id
    })
  })

  peers[socket_id].on('stream', stream => {
    if (stream.getVideoTracks().length > 0) {
      let newVid = document.createElement('video')
      newVid.width = '1600'
      newVid.srcObject = stream
      newVid.id = socket_id
      newVid.playsinline = false
      newVid.autoplay = true
      newVid.className = "vid"
      videos.appendChild(newVid)
    } else if (stream.getAudioTracks().length > 0) {
      const newAud = new Audio()
      newAud.id = `${socket_id}-audio`
      newAud.srcObject = stream
      newAud.autoplay = true
      newAud.playsinline = false
    }
  })
}