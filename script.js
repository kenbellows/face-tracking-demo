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

    //ctx.clearRect(0, 0, canvas.width, canvas.height)
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
    drawHat = drawImgAtCenter('yellow-rain-hat.png'),
    recents = [],
    maxRecents = 5


function processFace(face, faceIndex) {
    if (faceIndex+1 > recents.length) recents.push({
        face: [],
        eyes: [[], []],
        mouth: []
    })
    const recent = recents[faceIndex]

    const recentFaces = recent.face
    recentFaces.push(face.boundingBox)
    if (recentFaces.length > maxRecents) recentFaces.shift()

    const boundingBox = {}
    ;['x', 'y', 'width', 'height'].forEach(key => boundingBox[key] = recentFaces.reduce((sum, f) => sum + f[key], 0)/recentFaces.length)

    workCtx.strokeStyle = 'green'
    const {x, y, width, height} = boundingBox
    workCtx.strokeRect(x, y, width, height)

    drawHat(width*1.2, height)({x: x+width/2, y: y-height/8})

    let eyeIndex = 0
    for (let landmark of face.landmarks) {
        if (landmark.type === 'mouth') {
            workCtx.strokeStyle = 'red'
            const size = 10

            const recentMouths = recent.mouth
            recentMouths.push(landmark.locations[0])
            if (recentMouths.length > maxRecents) recentMouths.shift()

            const loc = {
                x: recentMouths.reduce((x, mouth) => x + mouth.x, 0)/recentMouths.length,
                y: recentMouths.reduce((y, mouth) => y + mouth.y, 0)/recentMouths.length
            }

            workCtx.strokeRect(loc.x-(size/2), loc.y-(size/2), size, size)
        }
        else if (landmark.type === 'eye') {
            const recentEyes = recent.eyes[eyeIndex++]
            recentEyes.push(landmark.locations[0])
            if (recentEyes.length > maxRecents) recentEyes.shift()
            const loc = {
                x: recentEyes.reduce((x, eye) => x + eye.x, 0)/recentEyes.length,
                y: recentEyes.reduce((y, eye) => y + eye.y, 0)/recentEyes.length
            }

            drawDonut(loc)
        }
    }
}
