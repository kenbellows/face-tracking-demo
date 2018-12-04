'use strict'

const video = document.createElement('video'),
    canvas = document.getElementById('canvas'),
    ctx = canvas.getContext('2d'),
    workCanvas = document.createElement('canvas'),
    workCtx = workCanvas.getContext('2d'),
    goBtn = document.getElementById('go'),
    stopBtn = document.getElementById('stop'),
    faceDetector = new FaceDetector


goBtn.onclick = () => {
    goBtn.disabled = true
    console.log('go!')
    navigator.mediaDevices.getUserMedia({video: {facingMode: 'user'}})
        .then(videoStream => {
            video.srcObject = videoStream
            video.addEventListener('canplay', go)
            video.play()

            stopBtn.onclick = () => {
                goBtn.disabled = false
                console.log('stop')
                for (let track of videoStream.getTracks())
                    track.stop()
            }
        })
        .catch(err => {
            goBtn.disabled = false
            throw err
        })
}

function go() {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    workCanvas.width = video.videoWidth
    workCanvas.height = video.videoHeight
    detectFaces()
}


const fps = 60,
    interval = 1000/fps
let now,
    then = Date.now(),
    delta

async function detectFaces() {
    if (video.paused || video.ended) return

    requestAnimationFrame(detectFaces)

    now = Date.now()
    delta = now - then

    if (delta < interval) return

    then = now - (delta % interval)

    workCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)

    const faces = await faceDetector.detect(video)
    faces.forEach(processFace)

    ctx.drawImage(workCanvas, 0, 0)
}




////////////////

const drawImgAtCenter = src => (width, height) => {
    const img = new Image
    img.src = src
    return ({x, y}) =>
        workCtx.drawImage(img, x - width/2, y - height/2, width, height)
}

const
    drawDonut = drawImgAtCenter('donut.png')(50, 50),
    drawHat = drawImgAtCenter('yellow-rain-hat.png')


function processFace(face) {
    workCtx.strokeStyle = 'green'
    const {x, y, width, height} = face.boundingBox
    workCtx.strokeRect(x, y, width, height)

    drawHat(width*1.2, height)({x: x+width/2, y: y-height/8})

    for (let landmark of face.landmarks) {
        if (landmark.type === 'mouth') {
            workCtx.strokeStyle = 'red'
            for (let loc of landmark.locations) {
                const size = 10
                workCtx.strokeRect(loc.x-(size/2), loc.y-(size/2), size, size)
            }
        }
        else if (landmark.type === 'eye') {
            drawDonut(landmark.locations[0])
        }
    }
}
