import React, { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { AVATAR_STATES } from '../../context/InterviewContext'
import { clsx } from 'clsx'
import { getSpeechVolume } from '../../services/speech'

const STATE_CONFIG = {
  [AVATAR_STATES.IDLE]: {
    label: 'Ready',
    color: 'bg-gray-500',
    ring: 'ring-gray-500/20',
    pulse: false,
    text: 'text-gray-400',
  },
  [AVATAR_STATES.SPEAKING]: {
    label: 'Speaking',
    color: 'bg-blue-500',
    ring: 'ring-blue-500/30',
    pulse: true,
    text: 'text-blue-400',
  },
  [AVATAR_STATES.LISTENING]: {
    label: 'Listening',
    color: 'bg-green-500',
    ring: 'ring-green-500/30',
    pulse: true,
    text: 'text-green-400',
  },
  [AVATAR_STATES.THINKING]: {
    label: 'Analyzing',
    color: 'bg-amber-500',
    ring: 'ring-amber-500/30',
    pulse: true,
    text: 'text-amber-400',
  },
}

// 3 Character Poses & Facial Expressions corresponding to States
const POSES = {
  [AVATAR_STATES.SPEAKING]: {
    spine: { x: 0.04, y: 0, z: 0 }, // Slight forward lean
    neck: { x: 0, y: 0, z: 0 },
    head: { x: 0, y: 0, z: 0 },
    leftArm: { x: -2.554, y: 1.387, z: -2.151 }, // Relaxed left arm
    rightArm: { x: -1.35, y: -0.65, z: 0.8 }, // Right arm gesturing at chest height
    rightForeArm: { x: 0, y: 1.15, z: 0.0 }, // Forearm bent forward
    leftForeArm: { x: 0, y: 0, z: 0 },
    leftEye: { x: 0, y: 0 },
    rightEye: { x: 0, y: 0 },
    // Blendshape weights
    browUp: 0.35, // Eyebrows raised
    eyeWide: 0.20, // Eyes wide
    squint: 0,
    smile: 0,
    browFurrow: 0,
  },
  [AVATAR_STATES.LISTENING]: {
    spine: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    head: { x: 0.01, y: 0, z: 0.14 }, // Head tilted 8 degrees (~0.14 rad)
    leftArm: { x: -2.554, y: 1.387, z: -2.151 }, // Symmetrical open arms
    rightArm: { x: -2.554, y: -1.387, z: 2.151 },
    rightForeArm: { x: 0, y: 0, z: 0 },
    leftForeArm: { x: 0, y: 0, z: 0 },
    leftEye: { x: 0, y: 0 },
    rightEye: { x: 0, y: 0 },
    // Blendshape weights
    browUp: 0,
    eyeWide: 0,
    squint: 0.15, // Attentive eyes
    smile: 0.32, // Closed-mouth smile
    browFurrow: 0,
  },
  [AVATAR_STATES.THINKING]: { // ANALYZING
    spine: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    head: { x: 0.02, y: -0.04, z: 0.0 }, // Head slightly tilted/angled
    leftArm: { x: -2.554, y: 1.387, z: -2.151 },
    rightArm: { x: -1.15, y: -0.42, z: 0.35 }, // Right arm raised towards chin
    rightForeArm: { x: 0, y: 1.55, z: 0.20 }, // Hand near chin
    leftForeArm: { x: 0, y: 0, z: 0 },
    leftEye: { x: -0.08, y: 0.05 }, // Shifted slightly upward, thinking gaze
    rightEye: { x: -0.08, y: 0.05 },
    // Blendshape weights
    browUp: 0,
    eyeWide: 0,
    squint: 0,
    smile: 0,
    browFurrow: 0.25, // Brow furrowed
  },
  [AVATAR_STATES.IDLE]: { // Ready state
    spine: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    head: { x: 0, y: 0, z: 0 },
    leftArm: { x: -2.554, y: 1.387, z: -2.151 },
    rightArm: { x: -2.554, y: -1.387, z: 2.151 },
    rightForeArm: { x: 0, y: 0, z: 0 },
    leftForeArm: { x: 0, y: 0, z: 0 },
    leftEye: { x: 0, y: 0 },
    rightEye: { x: 0, y: 0 },
    // Blendshape weights
    browUp: 0,
    eyeWide: 0,
    squint: 0,
    smile: 0.05,
    browFurrow: 0,
  }
}

// Simple Error Boundary to fallback to 2D Avatar if WebGL fails
class AvatarErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error("3D Avatar error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

function CameraController({ modelScene, onSetupComplete }) {
  const { camera } = useThree()

  useEffect(() => {
    if (!modelScene) return

    let headBone = null
    modelScene.traverse((child) => {
      if (child.isBone && child.name.toLowerCase().includes('head')) {
        headBone = child
      }
    })

    const headPos = new THREE.Vector3()
    if (headBone) {
      headBone.getWorldPosition(headPos)
    } else {
      const box = new THREE.Box3().setFromObject(modelScene)
      const size = box.getSize(new THREE.Vector3())
      headPos.y = box.max.y - size.y * 0.08
    }

    const cameraY = headPos.y - 0.06
    const cameraZ = 0.58
    camera.position.set(0, cameraY, cameraZ)
    
    const lookAtTarget = new THREE.Vector3(0, headPos.y - 0.14, 0)
    camera.lookAt(lookAtTarget)
    camera.updateProjectionMatrix()

    if (onSetupComplete) {
      onSetupComplete(lookAtTarget)
    }
  }, [modelScene, camera, onSetupComplete])

  return null
}

function AvatarModel({ avatarState, onModelLoaded }) {
  const { scene } = useGLTF('/model.glb')
  
  const headRef = useRef()
  const neckRef = useRef()
  const spineRef = useRef()
  const leftShoulderRef = useRef()
  const rightShoulderRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()
  const leftForeArmRef = useRef()
  const rightForeArmRef = useRef()
  const leftEyeRef = useRef()
  const rightEyeRef = useRef()
  
  const [skinnedMeshes, setSkinnedMeshes] = useState([])

  // Stores currently interpolated pose to enable 0.3s smooth transition blends
  const currentPoseRef = useRef({
    spine: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    head: { x: 0, y: 0, z: 0 },
    leftArm: { x: -2.554, y: 1.387, z: -2.151 },
    rightArm: { x: -2.554, y: -1.387, z: 2.151 },
    rightForeArm: { x: 0, y: 0, z: 0 },
    leftForeArm: { x: 0, y: 0, z: 0 },
    leftEye: { x: 0, y: 0 },
    rightEye: { x: 0, y: 0 },
    browUp: 0,
    eyeWide: 0,
    squint: 0,
    smile: 0,
    browFurrow: 0
  })

  useEffect(() => {
    if (onModelLoaded) {
      onModelLoaded(scene)
    }

    const meshes = []
    scene.traverse((child) => {
      // Setup shadow casting & receiving
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }

      if (child.isBone) {
        const name = child.name.toLowerCase()
        if (name.includes('head')) headRef.current = child
        if (name.includes('neck')) neckRef.current = child
        if (name.includes('spine') && !spineRef.current) spineRef.current = child
        if (name.includes('leftshoulder')) leftShoulderRef.current = child
        if (name.includes('rightshoulder')) rightShoulderRef.current = child
        if (name === 'leftarm') leftArmRef.current = child
        if (name === 'rightarm') rightArmRef.current = child
        if (name === 'leftforearm') leftForeArmRef.current = child
        if (name === 'rightforearm') rightForeArmRef.current = child
        if (name === 'lefteye') leftEyeRef.current = child
        if (name === 'righteye') rightEyeRef.current = child
      }

      if (child.isSkinnedMesh && child.morphTargetInfluences && child.morphTargetDictionary) {
        meshes.push(child)
      }
    })
    setSkinnedMeshes(meshes)

    // Symmetrical initial posture
    if (leftShoulderRef.current) leftShoulderRef.current.rotation.set(0, 0, 0)
    if (rightShoulderRef.current) rightShoulderRef.current.rotation.set(0, 0, 0)
    if (leftArmRef.current) leftArmRef.current.rotation.set(-2.554, 1.387, -2.151)
    if (rightArmRef.current) rightArmRef.current.rotation.set(-2.554, -1.387, 2.151)

    // Center model base
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    scene.position.x = -center.x
    scene.position.z = -center.z
  }, [scene, onModelLoaded])

  // Blinking, gaze, and eye saccade timers
  const blinkTimerRef = useRef(0)
  const blinkDurationRef = useRef(0)
  const isBlinkingRef = useRef(false)
  const saccadeTimerRef = useRef(0)
  const eyeTargetRotXRef = useRef(0)
  const eyeTargetRotYRef = useRef(0)

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime()

    // 1. Dynamic transition blending (0.3s blend)
    const targetPose = POSES[avatarState] || POSES[AVATAR_STATES.IDLE]
    const currentPose = currentPoseRef.current
    const lerpVal = Math.min(1.0, delta * 10) // 10 factor yields full transition in ~0.3s

    currentPose.spine.x = THREE.MathUtils.lerp(currentPose.spine.x, targetPose.spine.x, lerpVal)
    currentPose.spine.y = THREE.MathUtils.lerp(currentPose.spine.y, targetPose.spine.y, lerpVal)
    currentPose.spine.z = THREE.MathUtils.lerp(currentPose.spine.z, targetPose.spine.z, lerpVal)

    currentPose.neck.x = THREE.MathUtils.lerp(currentPose.neck.x, targetPose.neck.x, lerpVal)
    currentPose.neck.y = THREE.MathUtils.lerp(currentPose.neck.y, targetPose.neck.y, lerpVal)
    currentPose.neck.z = THREE.MathUtils.lerp(currentPose.neck.z, targetPose.neck.z, lerpVal)

    currentPose.head.x = THREE.MathUtils.lerp(currentPose.head.x, targetPose.head.x, lerpVal)
    currentPose.head.y = THREE.MathUtils.lerp(currentPose.head.y, targetPose.head.y, lerpVal)
    currentPose.head.z = THREE.MathUtils.lerp(currentPose.head.z, targetPose.head.z, lerpVal)

    currentPose.leftArm.x = THREE.MathUtils.lerp(currentPose.leftArm.x, targetPose.leftArm.x, lerpVal)
    currentPose.leftArm.y = THREE.MathUtils.lerp(currentPose.leftArm.y, targetPose.leftArm.y, lerpVal)
    currentPose.leftArm.z = THREE.MathUtils.lerp(currentPose.leftArm.z, targetPose.leftArm.z, lerpVal)

    currentPose.rightArm.x = THREE.MathUtils.lerp(currentPose.rightArm.x, targetPose.rightArm.x, lerpVal)
    currentPose.rightArm.y = THREE.MathUtils.lerp(currentPose.rightArm.y, targetPose.rightArm.y, lerpVal)
    currentPose.rightArm.z = THREE.MathUtils.lerp(currentPose.rightArm.z, targetPose.rightArm.z, lerpVal)

    currentPose.rightForeArm.x = THREE.MathUtils.lerp(currentPose.rightForeArm.x, targetPose.rightForeArm.x, lerpVal)
    currentPose.rightForeArm.y = THREE.MathUtils.lerp(currentPose.rightForeArm.y, targetPose.rightForeArm.y, lerpVal)
    currentPose.rightForeArm.z = THREE.MathUtils.lerp(currentPose.rightForeArm.z, targetPose.rightForeArm.z, lerpVal)

    currentPose.leftForeArm.x = THREE.MathUtils.lerp(currentPose.leftForeArm.x, targetPose.leftForeArm.x, lerpVal)
    currentPose.leftForeArm.y = THREE.MathUtils.lerp(currentPose.leftForeArm.y, targetPose.leftForeArm.y, lerpVal)
    currentPose.leftForeArm.z = THREE.MathUtils.lerp(currentPose.leftForeArm.z, targetPose.leftForeArm.z, lerpVal)

    currentPose.leftEye.x = THREE.MathUtils.lerp(currentPose.leftEye.x, targetPose.leftEye.x, lerpVal)
    currentPose.leftEye.y = THREE.MathUtils.lerp(currentPose.leftEye.y, targetPose.leftEye.y, lerpVal)

    currentPose.rightEye.x = THREE.MathUtils.lerp(currentPose.rightEye.x, targetPose.rightEye.x, lerpVal)
    currentPose.rightEye.y = THREE.MathUtils.lerp(currentPose.rightEye.y, targetPose.rightEye.y, lerpVal)

    currentPose.browUp = THREE.MathUtils.lerp(currentPose.browUp, targetPose.browUp, lerpVal)
    currentPose.eyeWide = THREE.MathUtils.lerp(currentPose.eyeWide, targetPose.eyeWide, lerpVal)
    currentPose.squint = THREE.MathUtils.lerp(currentPose.squint, targetPose.squint, lerpVal)
    currentPose.smile = THREE.MathUtils.lerp(currentPose.smile, targetPose.smile, lerpVal)
    currentPose.browFurrow = THREE.MathUtils.lerp(currentPose.browFurrow, targetPose.browFurrow, lerpVal)

    // 2. Secondary animation layers (Breathing, micro-movements)
    const breathing = Math.sin(time * 1.0) * 0.0012 // Spine breathing
    const armBreathing = Math.sin(time * 1.0) * 0.003
    const microHeadX = Math.sin(time * 0.4) * 0.0015 // Micro head shake/nod
    const microHeadY = Math.cos(time * 0.3) * 0.002

    if (spineRef.current) {
      spineRef.current.rotation.x = currentPose.spine.x + breathing
      spineRef.current.rotation.y = currentPose.spine.y
      spineRef.current.rotation.z = currentPose.spine.z
    }
    if (neckRef.current) {
      neckRef.current.rotation.x = currentPose.neck.x
      neckRef.current.rotation.y = currentPose.neck.y
      neckRef.current.rotation.z = currentPose.neck.z
    }
    if (headRef.current) {
      // Attentive head nodding in LISTENING state
      const listeningNod = (avatarState === AVATAR_STATES.LISTENING) ? (Math.sin(time * 2.2) * 0.012 + 0.012) : 0
      headRef.current.rotation.x = currentPose.head.x + microHeadX + listeningNod
      headRef.current.rotation.y = currentPose.head.y + microHeadY
      headRef.current.rotation.z = currentPose.head.z
    }

    if (leftShoulderRef.current) leftShoulderRef.current.rotation.set(0, 0, 0)
    if (rightShoulderRef.current) rightShoulderRef.current.rotation.set(0, 0, 0)

    // Arms locked to waist height/sides, will never raise above shoulder level passively
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = currentPose.leftArm.x
      leftArmRef.current.rotation.y = currentPose.leftArm.y
      leftArmRef.current.rotation.z = currentPose.leftArm.z + armBreathing
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = currentPose.rightArm.x
      rightArmRef.current.rotation.y = currentPose.rightArm.y
      rightArmRef.current.rotation.z = currentPose.rightArm.z - armBreathing
    }

    if (leftForeArmRef.current) {
      leftForeArmRef.current.rotation.x = currentPose.leftForeArm.x
      leftForeArmRef.current.rotation.y = currentPose.leftForeArm.y
      leftForeArmRef.current.rotation.z = currentPose.leftForeArm.z
    }
    if (rightForeArmRef.current) {
      rightForeArmRef.current.rotation.x = currentPose.rightForeArm.x
      rightForeArmRef.current.rotation.y = currentPose.rightForeArm.y
      rightForeArmRef.current.rotation.z = currentPose.rightForeArm.z
    }

    // 3. Eye Gaze Control (Eye contact with camera + subtle saccades)
    saccadeTimerRef.current += delta
    if (saccadeTimerRef.current > 3.0 + Math.random() * 2.0) {
      saccadeTimerRef.current = 0
      if (Math.random() > 0.8) {
        eyeTargetRotXRef.current = (Math.random() - 0.5) * 0.003
        eyeTargetRotYRef.current = (Math.random() - 0.5) * 0.004
      } else {
        eyeTargetRotXRef.current = 0
        eyeTargetRotYRef.current = 0
      }
    }
    if (leftEyeRef.current) {
      leftEyeRef.current.rotation.x = currentPose.leftEye.x + eyeTargetRotXRef.current
      leftEyeRef.current.rotation.y = currentPose.leftEye.y + eyeTargetRotYRef.current
    }
    if (rightEyeRef.current) {
      rightEyeRef.current.rotation.x = currentPose.rightEye.x + eyeTargetRotXRef.current
      rightEyeRef.current.rotation.y = currentPose.rightEye.y + eyeTargetRotYRef.current
    }

    // 4. Natural Blinking (once every 3 to 5 seconds)
    blinkTimerRef.current += delta
    if (!isBlinkingRef.current && blinkTimerRef.current > 3.0 + Math.random() * 2.0) {
      isBlinkingRef.current = true
      blinkTimerRef.current = 0
      blinkDurationRef.current = 0
    }

    let blinkInfluence = 0
    if (isBlinkingRef.current) {
      blinkDurationRef.current += delta
      const duration = blinkDurationRef.current
      if (duration < 0.08) {
        blinkInfluence = duration / 0.08
      } else if (duration < 0.16) {
        blinkInfluence = 1 - (duration - 0.08) / 0.08
      } else {
        isBlinkingRef.current = false
        blinkInfluence = 0
      }
    }

    // 5. Lip Sync (Active only in SPEAKING state)
    let mouthInfluence = 0
    if (avatarState === AVATAR_STATES.SPEAKING) {
      const liveVolume = getSpeechVolume()
      if (liveVolume > 0.02) {
        mouthInfluence = Math.min(0.40, liveVolume * 0.85)
      } else {
        // Natural slow procedural fallback with pauses
        const slowTime = time * 6.0
        mouthInfluence = Math.abs(
          Math.sin(slowTime) * 0.15 +
          Math.sin(slowTime * 1.5) * 0.1 +
          Math.sin(slowTime * 0.5) * 0.05
        )
        if (mouthInfluence < 0.08) mouthInfluence = 0
        mouthInfluence = Math.min(0.32, mouthInfluence)
      }
    }

    // Apply morph target blendshapes to all meshes
    skinnedMeshes.forEach((mesh) => {
      const dict = mesh.morphTargetDictionary
      const infs = mesh.morphTargetInfluences
      if (dict && infs) {
        // Blinking
        const leftBlink = dict['eyeBlinkLeft'] ?? dict['blink_L'] ?? dict['eyeBlink_L'] ?? dict['Blink_Left']
        const rightBlink = dict['eyeBlinkRight'] ?? dict['blink_R'] ?? dict['eyeBlink_R'] ?? dict['Blink_Right']
        if (leftBlink !== undefined) infs[leftBlink] = blinkInfluence
        if (rightBlink !== undefined) infs[rightBlink] = blinkInfluence

        // Lip Sync
        const jawOpen = dict['jawOpen'] ?? dict['mouthOpen'] ?? dict['mouth_O'] ?? dict['mouthOpen_h'] ?? dict['Mouth_Open']
        if (jawOpen !== undefined) {
          infs[jawOpen] = mouthInfluence
        }
        const mouthFunnel = dict['mouthFunnel'] ?? dict['mouthPucker'] ?? dict['mouth_Funnel'] ?? dict['mouth_Pucker']
        if (mouthFunnel !== undefined) {
          infs[mouthFunnel] = mouthInfluence * 0.25
        }

        // Brow Lift (Speaking)
        const browL = dict['browOuterUpLeft'] ?? dict['browOuterUp_L'] ?? dict['BrowOuterUp_Left']
        const browR = dict['browOuterUpRight'] ?? dict['browOuterUp_R'] ?? dict['BrowOuterUp_Right']
        if (browL !== undefined) infs[browL] = currentPose.browUp
        if (browR !== undefined) infs[browR] = currentPose.browUp

        // Eyes Wide (Speaking)
        const wideL = dict['eyeWideLeft'] ?? dict['eyeWide_L'] ?? dict['EyeWide_Left']
        const wideR = dict['eyeWideRight'] ?? dict['eyeWide_R'] ?? dict['EyeWide_Right']
        if (wideL !== undefined) infs[wideL] = currentPose.eyeWide
        if (wideR !== undefined) infs[wideR] = currentPose.eyeWide

        // Squint (Listening)
        const squintL = dict['eyeSquintLeft'] ?? dict['eyeSquint_L'] ?? dict['EyeSquint_Left']
        const squintR = dict['eyeSquintRight'] ?? dict['eyeSquint_R'] ?? dict['EyeSquint_Right']
        if (squintL !== undefined) infs[squintL] = currentPose.squint
        if (squintR !== undefined) infs[squintR] = currentPose.squint

        // Closed-mouth Smile (Listening)
        const smileL = dict['mouthSmileLeft'] ?? dict['mouthSmile_L'] ?? dict['Smile_Left']
        const smileR = dict['mouthSmileRight'] ?? dict['mouthSmile_R'] ?? dict['Smile_Right']
        if (smileL !== undefined) infs[smileL] = currentPose.smile
        if (smileR !== undefined) infs[smileR] = currentPose.smile

        // Brow Furrow (Analyzing)
        const furrowL = dict['browDownLeft'] ?? dict['browDown_L'] ?? dict['BrowDown_Left']
        const furrowR = dict['browDownRight'] ?? dict['browDown_R'] ?? dict['BrowDown_Right']
        if (furrowL !== undefined) infs[furrowL] = currentPose.browFurrow
        if (furrowR !== undefined) infs[furrowR] = currentPose.browFurrow
      }
    })
  })

  return <primitive object={scene} />
}

export default function AvatarPanel({ avatarState = AVATAR_STATES.IDLE, avatarUrl = null }) {
  const config = STATE_CONFIG[avatarState] || STATE_CONFIG[AVATAR_STATES.IDLE]
  const envUrl = import.meta.env.VITE_AVATAR_URL || null
  const url = avatarUrl || envUrl

  const [modelScene, setModelScene] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!url) {
      useGLTF.preload('/model.glb')
    }
  }, [url])

  const handleModelLoaded = (scene) => {
    setModelScene(scene)
    setLoading(false)
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-dark-900 rounded-2xl overflow-hidden shadow-2xl">
      <div className={clsx(
        'relative w-full h-full rounded-2xl overflow-hidden ring-4 transition-all duration-500',
        config.ring
      )}>
        {url ? (
          <iframe
            src={url}
            className="w-full h-full border-0"
            allow="camera; microphone"
            title="AI Interviewer Avatar"
          />
        ) : (
          <AvatarErrorBoundary fallback={<FallbackAvatar avatarState={avatarState} config={config} />}>
            {/* Plain solid-color Deep Navy background with soft edge vignette */}
            <div 
              className="absolute inset-0 transition-opacity duration-1000"
              style={{ 
                background: 'radial-gradient(circle, #1B2A4A 72%, #0c1424 100%)',
              }}
            />
            
            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-dark-800/80 flex flex-col items-center justify-center z-10">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
                <span className="text-gray-300 text-sm font-semibold">Preparing 3D Interviewer...</span>
              </div>
            )}

            <Canvas
              shadows
              gl={{ 
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.05,
                outputColorSpace: THREE.SRGBColorSpace 
              }}
              style={{ background: 'transparent' }}
            >
              {/* Studio Lighting System */}
              {/* Soft Ambient baseline illumination */}
              <ambientLight intensity={0.7} />
              
              {/* Key Light: soft frontal light to illuminate face clearly */}
              <directionalLight
                position={[0.2, 1.8, 1.5]}
                intensity={1.25}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-bias={-0.0001}
              />
              
              {/* Fill Light: gentle opposing fill to reduce harsh shadows */}
              <directionalLight
                position={[-1.2, 1.0, 1.0]}
                intensity={0.6}
              />
              
              {/* Rim/edge light: subtle cool glow on shoulders/head to separate avatar from deep navy background */}
              <directionalLight
                position={[0, 2.5, -1.8]}
                intensity={2.3}
                color="#e0e7ff"
              />

              {/* Suspense Wrapper for Async loading of GLB model */}
              <Suspense fallback={null}>
                <AvatarModel avatarState={avatarState} onModelLoaded={handleModelLoaded} />
                <CameraController modelScene={modelScene} />
              </Suspense>
            </Canvas>
          </AvatarErrorBoundary>
        )}

        {/* Speaking waveform overlay */}
        {avatarState === AVATAR_STATES.SPEAKING && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-8">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="wave-bar w-1.5" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className={clsx(
        'absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm bg-dark-800/80 border border-white/10'
      )}>
        <div className={clsx('w-2 h-2 rounded-full', config.color, config.pulse && 'animate-pulse')} />
        <span className={clsx('text-xs font-semibold', config.text)}>{config.label}</span>
      </div>
    </div>
  )
}

// ─── Fallback CSS Avatar (rendered if WebGL / Canvas fails) ────────────────
function FallbackAvatar({ avatarState, config }) {
  const isSpeaking = avatarState === AVATAR_STATES.SPEAKING
  const isListening = avatarState === AVATAR_STATES.LISTENING
  const isThinking  = avatarState === AVATAR_STATES.THINKING

  return (
    <div className="w-full h-full bg-gradient-to-b from-dark-600 to-dark-800 flex flex-col items-center justify-center relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(109,95,232,0.12)_0%,transparent_70%)]" />

      <div className={clsx(
        'relative transition-all duration-300',
        isSpeaking && 'scale-105',
        isThinking && 'translate-y-1',
      )}>
        <div className={clsx(
          'w-28 h-28 rounded-full bg-gradient-to-b from-amber-200 to-amber-300 mx-auto relative shadow-2xl',
          isSpeaking && 'animate-bounce-slow',
        )}>
          <div className="absolute top-8 left-6 right-6 flex justify-between">
            <div className={clsx(
              'w-4 h-4 bg-gray-800 rounded-full relative overflow-hidden',
              !isSpeaking && 'animate-[blink_4s_ease-in-out_infinite]'
            )}>
              <div className="absolute inset-1 bg-dark-900 rounded-full" />
              <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            <div className={clsx(
              'w-4 h-4 bg-gray-800 rounded-full relative overflow-hidden',
              !isSpeaking && 'animate-[blink_4s_ease-in-out_infinite_0.1s]'
            )}>
              <div className="absolute inset-1 bg-dark-900 rounded-full" />
              <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            {isSpeaking ? (
              <div className="w-8 h-4 border-2 border-gray-700 rounded-full bg-red-900/40 animate-pulse" />
            ) : isListening ? (
              <div className="w-6 h-1.5 bg-gray-700 rounded-full" />
            ) : (
              <div className="w-8 h-1 bg-gray-600 rounded-full" />
            )}
          </div>

          {isThinking && (
            <div className="absolute -top-2 -right-2 flex gap-0.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          )}
        </div>

        <div className="w-10 h-8 bg-amber-200 mx-auto" />
        <div className="w-44 h-32 bg-gradient-to-b from-primary-700 to-primary-800 rounded-t-3xl mx-auto -mt-1 flex items-center justify-center shadow-xl">
          <div className="w-8 h-20 bg-primary-500 rounded-b-lg opacity-60" />
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-dark-700/90 border border-white/10 rounded-xl px-4 py-2 text-center backdrop-blur-sm">
        <p className="text-white text-sm font-bold">AI Interviewer</p>
        <p className={clsx('text-xs font-medium', config.text)}>{config.label}...</p>
      </div>
    </div>
  )
}
