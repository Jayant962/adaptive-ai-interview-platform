import React, { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { AVATAR_STATES } from '../../context/InterviewContext'
import { clsx } from 'clsx'

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
    color: 'bg-primary-500',
    ring: 'ring-primary-500/30',
    pulse: true,
    text: 'text-primary-400',
  },
  [AVATAR_STATES.LISTENING]: {
    label: 'Listening',
    color: 'bg-green-500',
    ring: 'ring-green-500/30',
    pulse: true,
    text: 'text-green-400',
  },
  [AVATAR_STATES.THINKING]: {
    label: 'Thinking',
    color: 'bg-yellow-500',
    ring: 'ring-yellow-500/30',
    pulse: true,
    text: 'text-yellow-400',
  },
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

    // Calculate model bounds
    const box = new THREE.Box3().setFromObject(modelScene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    // Frame the upper body (head, shoulders, chest)
    // Eye level is slightly below top of the head
    const eyeLevelY = box.max.y - size.y * 0.08
    
    // Zoom in closer to capture only head, shoulders, and chest (excluding lower body/hips)
    const cameraDistance = size.y * 0.27
    
    camera.position.set(0, eyeLevelY, cameraDistance)
    
    // Look at center of upper body (slightly below eye level, around neck/upper chest)
    const lookAtTarget = new THREE.Vector3(0, eyeLevelY - size.y * 0.04, 0)
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
  const leftArmRef = useRef()
  const rightArmRef = useRef()
  const leftForeArmRef = useRef()
  const rightForeArmRef = useRef()
  const leftEyeRef = useRef()
  const rightEyeRef = useRef()
  
  const [skinnedMeshes, setSkinnedMeshes] = useState([])

  useEffect(() => {
    if (onModelLoaded) {
      onModelLoaded(scene)
    }

    const meshes = []
    scene.traverse((child) => {
      if (child.isBone) {
        const name = child.name.toLowerCase()
        if (name.includes('head')) headRef.current = child
        if (name.includes('neck')) neckRef.current = child
        if (name.includes('spine') && !spineRef.current) spineRef.current = child
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

    // Position arms in a natural resting pose immediately so that CameraController
    // computes the bounding box with the arms down instead of extended.
    if (leftArmRef.current) {
      leftArmRef.current.rotation.set(-2.554, 1.387, -2.151)
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.set(-2.554, -1.387, 2.151)
    }

    // Center model horizontally and vertically at base
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    scene.position.x = -center.x
    scene.position.z = -center.z
  }, [scene, onModelLoaded])

  // State timers for blinking, natural gaze, and eye saccades
  const blinkTimerRef = useRef(0)
  const blinkDurationRef = useRef(0)
  const isBlinkingRef = useRef(false)
  const saccadeTimerRef = useRef(0)
  const eyeTargetRotXRef = useRef(0)
  const eyeTargetRotYRef = useRef(0)

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime()

    // 1. Breathing & posture: subtle body movement
    if (spineRef.current) {
      spineRef.current.rotation.x = Math.sin(time * 1.2) * 0.005
    }
    if (neckRef.current) {
      neckRef.current.rotation.y = Math.sin(time * 0.8) * 0.008
      neckRef.current.rotation.x = Math.sin(time * 0.6) * 0.005
    }

    // Subtle breathing posture animation for the arms
    if (leftArmRef.current) {
      leftArmRef.current.rotation.set(-2.554, 1.387, -2.151 + Math.sin(time * 1.2) * 0.008)
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.set(-2.554, -1.387, 2.151 - Math.sin(time * 1.2) * 0.008)
    }

    // Saccadic eye movements (tiny random shifts for realistic gaze)
    saccadeTimerRef.current += delta
    if (saccadeTimerRef.current > 1.5 + Math.random() * 2) {
      saccadeTimerRef.current = 0
      if (Math.random() > 0.4) {
        eyeTargetRotXRef.current = (Math.random() - 0.5) * 0.025
        eyeTargetRotYRef.current = (Math.random() - 0.5) * 0.035
      } else {
        eyeTargetRotXRef.current = 0
        eyeTargetRotYRef.current = 0
      }
    }
    if (leftEyeRef.current) {
      leftEyeRef.current.rotation.x = THREE.MathUtils.lerp(leftEyeRef.current.rotation.x, eyeTargetRotXRef.current, 0.1)
      leftEyeRef.current.rotation.y = THREE.MathUtils.lerp(leftEyeRef.current.rotation.y, eyeTargetRotYRef.current, 0.1)
    }
    if (rightEyeRef.current) {
      rightEyeRef.current.rotation.x = THREE.MathUtils.lerp(rightEyeRef.current.rotation.x, eyeTargetRotXRef.current, 0.1)
      rightEyeRef.current.rotation.y = THREE.MathUtils.lerp(rightEyeRef.current.rotation.y, eyeTargetRotYRef.current, 0.1)
    }

    // Adjust head angle based on avatar state (Listening nod, Thinking look-away, Idle micro-movements)
    if (headRef.current) {
      if (avatarState === AVATAR_STATES.LISTENING) {
        headRef.current.rotation.z = Math.sin(time * 0.8) * 0.01 + 0.015
        headRef.current.rotation.x = Math.sin(time * 1.5) * 0.01 + 0.02
        headRef.current.rotation.y = Math.sin(time * 0.5) * 0.005
      } else if (avatarState === AVATAR_STATES.THINKING) {
        headRef.current.rotation.x = 0.08 + Math.sin(time * 0.5) * 0.008
        headRef.current.rotation.y = -0.06 + Math.sin(time * 0.3) * 0.005
        headRef.current.rotation.z = -0.01
      } else {
        headRef.current.rotation.x = Math.sin(time * 0.9) * 0.006
        headRef.current.rotation.y = Math.sin(time * 0.7) * 0.008
        headRef.current.rotation.z = 0
      }
    }

    // 2. Realistic Blinking:
    blinkTimerRef.current += delta
    if (!isBlinkingRef.current && blinkTimerRef.current > 3.5 + Math.random() * 2.5) {
      isBlinkingRef.current = true
      blinkTimerRef.current = 0
      blinkDurationRef.current = 0
    }

    let blinkInfluence = 0
    if (isBlinkingRef.current) {
      blinkDurationRef.current += delta
      const duration = blinkDurationRef.current
      if (duration < 0.08) {
        blinkInfluence = duration / 0.08 // closing
      } else if (duration < 0.16) {
        blinkInfluence = 1 - (duration - 0.08) / 0.08 // opening
      } else {
        isBlinkingRef.current = false
        blinkInfluence = 0
      }
    }

    // 3. Smooth Lip Sync (mouth open speech logic):
    let mouthInfluence = 0
    if (avatarState === AVATAR_STATES.SPEAKING) {
      mouthInfluence = Math.abs(
        Math.sin(time * 12) * 0.35 +
        Math.sin(time * 18) * 0.25 +
        Math.sin(time * 6) * 0.15 +
        Math.random() * 0.15
      )
      mouthInfluence = Math.max(0, Math.min(0.75, mouthInfluence))
    }

    // Apply morph target blendshapes to all skinned meshes
    skinnedMeshes.forEach((mesh) => {
      const dict = mesh.morphTargetDictionary
      const infs = mesh.morphTargetInfluences
      if (dict && infs) {
        // Blinking
        const leftBlink = dict['eyeBlinkLeft'] ?? dict['blink_L'] ?? dict['eyeBlink_L'] ?? dict['Blink_Left']
        const rightBlink = dict['eyeBlinkRight'] ?? dict['blink_R'] ?? dict['eyeBlink_R'] ?? dict['Blink_Right']
        if (leftBlink !== undefined) infs[leftBlink] = blinkInfluence
        if (rightBlink !== undefined) infs[rightBlink] = blinkInfluence

        // Lip Sync / Speech (Jaw + mouth shape variety)
        const jawOpen = dict['jawOpen'] ?? dict['mouthOpen'] ?? dict['mouth_O'] ?? dict['mouthOpen_h'] ?? dict['Mouth_Open']
        if (jawOpen !== undefined) {
          infs[jawOpen] = mouthInfluence
        }
        
        const mouthFunnel = dict['mouthFunnel'] ?? dict['mouthPucker'] ?? dict['mouth_Funnel'] ?? dict['mouth_Pucker']
        if (mouthFunnel !== undefined) {
          infs[mouthFunnel] = mouthInfluence * 0.3
        }

        // Friendly Smile (Subtle lift at the corners, slightly fluctuating)
        const smileL = dict['mouthSmileLeft'] ?? dict['mouthSmile_L'] ?? dict['Smile_Left']
        const smileR = dict['mouthSmileRight'] ?? dict['mouthSmile_R'] ?? dict['Smile_Right']
        const smileInfluence = 0.08 + Math.sin(time * 1.5) * 0.03
        if (smileL !== undefined) infs[smileL] = smileInfluence
        if (smileR !== undefined) infs[smileR] = smileInfluence
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

  // Pre-load GLB avatar
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
      {/* 3D Canvas or iframe or fallback */}
      <div className={clsx(
        'relative w-full h-full rounded-2xl overflow-hidden ring-4 transition-all duration-500',
        config.ring
      )}>
        {url ? (
          // Render custom iframe URL if set
          <iframe
            src={url}
            className="w-full h-full border-0"
            allow="camera; microphone"
            title="AI Interviewer Avatar"
          />
        ) : (
          // Otherwise, render our high-quality local 3D GLB model
          <AvatarErrorBoundary fallback={<FallbackAvatar avatarState={avatarState} config={config} />}>
            {/* Blurry office background backdrop */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
              style={{ 
                backgroundImage: "url('/office_background.png')",
                filter: "brightness(0.85) contrast(1.05)"
              }}
            />
            
            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-dark-800/80 flex flex-col items-center justify-center z-10">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
                <span className="text-gray-300 text-sm font-semibold">Preparing 3D Interviewer...</span>
              </div>
            )}

            {/* R3F Canvas */}
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
              <ambientLight intensity={0.5} />
              
              {/* Key Light (Bright directional light from front-left) */}
              <directionalLight
                position={[1.5, 2.5, 2]}
                intensity={1.3}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-bias={-0.0001}
              />
              
              {/* Fill Light (Softer directional light from front-right) */}
              <directionalLight
                position={[-1.5, 2.5, 2]}
                intensity={0.65}
              />
              
              {/* Rim Light / Backlight (Highlights head and shoulders) */}
              <directionalLight
                position={[0, 3, -2.5]}
                intensity={1.8}
                color="#e2e8f0"
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
