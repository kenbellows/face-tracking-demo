'use strict'

const canvas = document.getElementById('canvas'),
    ctx = canvas.getContext('2d'),
    workCanvas = document.createElement('canvas'),
    workCtx = workCanvas.getContext('2d'),
    webcamBtn = document.getElementById('webcam'),
    obamaBtn = document.getElementById('obama'),
    stopBtn = document.getElementById('stop'),
    loadForm = document.getElementById('loadVid'),
    videoUrl = document.getElementById('videoUrl'),
    faceDetector = new FaceDetector

let video,
    stop = () => {}

function initVideo() {
    video = document.createElement('video')
    video.crossOrigin = 'anonymous'
}

stopBtn.onclick = () => stop()

webcamBtn.onclick = () => {
    stop && stop()
    webcamBtn.disabled = true
    console.log('webcam!')

    initVideo()
    navigator.mediaDevices.getUserMedia({video: {facingMode: 'user'}})
        .then(videoStream => {
            video.srcObject = videoStream
            video.addEventListener('canplay', go)
            video.play()

            stop = () => {
                webcamBtn.disabled = false
                console.log('stop')
                for (let track of videoStream.getTracks())
                    track.stop()
            }
        })
        .catch(err => {
            webcamBtn.disabled = false
            throw err
        })
}

obamaBtn.onclick = () => {
    obamaBtn.disabled = true
    console.log('obama!')

    loadVideo('media/fake-obama.mp4')
        .catch(err => {
            obamaBtn.disabled = false
            throw err
        })

    stop = () => {
        obamaBtn.disabled = false
        console.log('stop')
        video.pause()
    }
}

loadForm.onsubmit = e => {
    e.preventDefault()

    loadVideo(videoUrl.value)

    stop = () => {
        console.log('stop')
        video.pause()
    }
}

async function loadVideo(url) {
    stop()
    initVideo()
    video.src = url
    video.addEventListener('canplay', go)
    video.play()
}


function go() {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    workCanvas.width = video.videoWidth
    workCanvas.height = video.videoHeight
    detectFaces()
}


const fps = 80,
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

const drawImgAtCenter = src => {
    const img = new Image
    img.src = src
    return (x, y, width, height) =>
        workCtx.drawImage(img, x - width/2, y - height/2, width, height)
}

const
    drawDonut = drawImgAtCenter('media/donut.png'),
    drawHat = drawImgAtCenter('media/yellow-rain-hat.png'),
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

    drawHat(x+width/2, y, width*1.4, height*1.2)

    let eyes = []
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
            eyes.push(landmark.locations[0])
        }
    }
    const eyeSize = Math.round(Math.sqrt(Math.pow(eyes[1].x-eyes[0].x, 2) + Math.pow(eyes[1].y - eyes[0].y, 2)) * 0.75)
    eyes.forEach((eye, eyeIndex) => {
        const recentEyes = recent.eyes[eyeIndex++]
        recentEyes.push(eye)
        if (recentEyes.length > maxRecents) recentEyes.shift()
        const loc = {
            x: recentEyes.reduce((x, eye) => x + eye.x, 0)/recentEyes.length,
            y: recentEyes.reduce((y, eye) => y + eye.y, 0)/recentEyes.length
        }

        drawDonut(loc.x, loc.y, eyeSize, eyeSize)
    })
}
