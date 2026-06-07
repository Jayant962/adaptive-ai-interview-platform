import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { AVATAR_STATES } from '../../context/InterviewContext'
import { clsx } from 'clsx'
import { getSpeechVolume } from '../../services/speech'
import { useTheme } from '../../context/ThemeContext'

// ─── State badge config ────────────────────────────────────────────────────────
const STATE_CONFIG = {
  [AVATAR_STATES.IDLE]: {
    label: 'Waiting',
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
  [AVATAR_STATES.PREPARING]: {
    label: 'Preparing',
    color: 'bg-purple-500',
    ring: 'ring-purple-500/30',
    pulse: true,
    text: 'text-purple-400',
  },
}

// ─── Facial expression poses (uses exact morph names from this Avaturn GLB) ───
// All values 0.0 – 1.0
const POSES = {
  [AVATAR_STATES.SPEAKING]: {
    spine: { x: 0.04, y: 0, z: 0 },
    neck: { x: -0.02, y: 0, z: 0 },
    head: { x: 0, y: 0, z: 0 },
    browInnerUp: 0.25,
    browOuterUpLeft: 0.15,
    browOuterUpRight: 0.15,
    browDownLeft: 0,
    browDownRight: 0,
    eyeWideLeft: 0.10,
    eyeWideRight: 0.10,
    eyeSquintLeft: 0,
    eyeSquintRight: 0,
    cheekSquintLeft: 0.10,
    cheekSquintRight: 0.10,
    mouthSmileLeft: 0.12,
    mouthSmileRight: 0.12,
    mouthSmile: 0.10,
    mouthPressLeft: 0,
    mouthPressRight: 0,
    noseSneerLeft: 0,
    noseSneerRight: 0,
    eyeLookUp: 0,
    eyeLookOut: 0,
  },

  [AVATAR_STATES.LISTENING]: {
    spine: { x: 0.02, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0.02 },
    head: { x: 0.02, y: 0, z: 0.04 }, // Subtle, natural attentive tilt
    browInnerUp: 0.15,
    browOuterUpLeft: 0.08,
    browOuterUpRight: 0.08,
    browDownLeft: 0,
    browDownRight: 0,
    eyeWideLeft: 0,
    eyeWideRight: 0,
    eyeSquintLeft: 0.15,
    eyeSquintRight: 0.15,
    cheekSquintLeft: 0.22,
    cheekSquintRight: 0.22,
    mouthSmileLeft: 0.20,
    mouthSmileRight: 0.20,
    mouthSmile: 0.15, // Warm professional smile
    mouthPressLeft: 0,
    mouthPressRight: 0,
    noseSneerLeft: 0,
    noseSneerRight: 0,
    eyeLookUp: 0,
    eyeLookOut: 0,
  },

  [AVATAR_STATES.THINKING]: {
    spine: { x: 0, y: 0, z: 0 },
    neck: { x: 0.02, y: -0.04, z: 0 },
    head: { x: 0.02, y: -0.06, z: 0.02 }, // Looking slightly to the side
    browInnerUp: 0.10,
    browOuterUpLeft: 0,
    browOuterUpRight: 0,
    browDownLeft: 0.20,
    browDownRight: 0.20, // Analytical furrow, not angry
    eyeWideLeft: 0,
    eyeWideRight: 0,
    eyeSquintLeft: 0.15,
    eyeSquintRight: 0.15,
    cheekSquintLeft: 0.05,
    cheekSquintRight: 0.05,
    mouthSmileLeft: 0,
    mouthSmileRight: 0,
    mouthSmile: 0,
    mouthPressLeft: 0.15,
    mouthPressRight: 0.15, // Closed pressed mouth
    noseSneerLeft: 0.05,
    noseSneerRight: 0.05,
    eyeLookUp: 0.15, // Upward thinking gaze
    eyeLookOut: 0.08,
  },

  [AVATAR_STATES.IDLE]: {
    spine: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    head: { x: 0, y: 0, z: 0 },
    browInnerUp: 0,
    browOuterUpLeft: 0,
    browOuterUpRight: 0,
    browDownLeft: 0,
    browDownRight: 0,
    eyeWideLeft: 0,
    eyeWideRight: 0,
    eyeSquintLeft: 0,
    eyeSquintRight: 0,
    cheekSquintLeft: 0,
    cheekSquintRight: 0,
    mouthSmileLeft: 0.12,
    mouthSmileRight: 0.12,
    mouthSmile: 0.08, // Subtle pleasant ready pose
    mouthPressLeft: 0,
    mouthPressRight: 0,
    noseSneerLeft: 0,
    noseSneerRight: 0,
    eyeLookUp: 0,
    eyeLookOut: 0,
  },

  [AVATAR_STATES.PREPARING]: {
    spine: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    head: { x: 0, y: 0, z: 0 },
    browInnerUp: 0,
    browOuterUpLeft: 0,
    browOuterUpRight: 0,
    browDownLeft: 0,
    browDownRight: 0,
    eyeWideLeft: 0,
    eyeWideRight: 0,
    eyeSquintLeft: 0,
    eyeSquintRight: 0,
    cheekSquintLeft: 0,
    cheekSquintRight: 0,
    mouthSmileLeft: 0.12,
    mouthSmileRight: 0.12,
    mouthSmile: 0.08,
    mouthPressLeft: 0,
    mouthPressRight: 0,
    noseSneerLeft: 0,
    noseSneerRight: 0,
    eyeLookUp: 0,
    eyeLookOut: 0,
  },
}

// ─── Error boundary ────────────────────────────────────────────────────────────
class AvatarErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err, info) { console.error('3D Avatar error:', err, info) }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

// ─── Camera — tight portrait crop (face + top of shoulders only) ─────────────
function CameraController({ modelScene, onSetupComplete }) {
  const { camera } = useThree()

  useEffect(() => {
    if (!modelScene) return
    modelScene.updateMatrixWorld(true)

    let headBone = null
    modelScene.traverse((child) => {
      if (child.isBone && child.name === 'Head') headBone = child
    })

    const headPos = new THREE.Vector3()
    let headY = 1.45

    if (headBone) {
      headBone.getWorldPosition(headPos)
      headY = headPos.y
    } else {
      const box = new THREE.Box3().setFromObject(modelScene)
      const size = box.getSize(new THREE.Vector3())
      headY = box.max.y - size.y * 0.08
    }

    // Set camera ONCE — not in useFrame
    camera.position.set(0, headY - 0.05, 1.18)
    camera.lookAt(new THREE.Vector3(0, headY - 0.14, 0))
    camera.fov = 34
    camera.updateProjectionMatrix()

    if (onSetupComplete) onSetupComplete(new THREE.Vector3(0, headY - 0.05, 0))
  }, [modelScene, camera, onSetupComplete])

  // No useFrame at all — camera stays fixed
  return null
}

// ─── 3-D Avatar model ─────────────────────────────────────────────────────────
function AvatarModel({ avatarState, onModelLoaded }) {
  const { scene, animations } = useGLTF('/model.glb')
  const { actions } = useAnimations(animations, scene)

  useEffect(() => {
    if (actions && actions['avaturn_animation']) {
      const action = actions['avaturn_animation']
      action.play()
      action.paused = true
    }
  }, [actions])

  // Bone refs — exact names match this Avaturn GLB
  const headRef = useRef()
  const neckRef = useRef()
  const spineRef = useRef()
  const spine2Ref = useRef()
  const leftShoulderRef = useRef()
  const rightShoulderRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()
  const leftForeArmRef = useRef()
  const rightForeArmRef = useRef()
  const leftEyeRef = useRef()
  const rightEyeRef = useRef()

  const [skinnedMeshes, setSkinnedMeshes] = useState([])

  // Current interpolated pose (smoothly blended each frame)
  const poseRef = useRef({
    spine: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    head: { x: 0, y: 0, z: 0 },
    browInnerUp: 0,
    browOuterUpLeft: 0,
    browOuterUpRight: 0,
    browDownLeft: 0,
    browDownRight: 0,
    eyeWideLeft: 0,
    eyeWideRight: 0,
    eyeSquintLeft: 0,
    eyeSquintRight: 0,
    cheekSquintLeft: 0,
    cheekSquintRight: 0,
    mouthSmileLeft: 0.07,
    mouthSmileRight: 0.07,
    mouthSmile: 0.05,
    mouthPressLeft: 0,
    mouthPressRight: 0,
    noseSneerLeft: 0,
    noseSneerRight: 0,
    eyeLookUp: 0,
    eyeLookOut: 0,
  })

  // Lip sync state
  const lipPhaseRef = useRef(0)
  const forceLipResetRef = useRef(false)
  const smoothedVolRef = useRef(0)
  const lipWeightsRef = useRef({
    jawW: 0,
    mouthOpenW: 0,
    funnelW: 0,
    puckerW: 0,
    lowerDownW: 0,
    upperUpW: 0,
    rollLowerW: 0,
    viseme_aa: 0,
    viseme_O: 0,
    viseme_E: 0,
    viseme_U: 0,
    viseme_PP: 0,
    viseme_FF: 0,
    viseme_TH: 0,
    viseme_DD: 0,
  })

  // Snap lips shut instantly when avatar stops speaking
  useEffect(() => {
    if (avatarState !== AVATAR_STATES.SPEAKING) {
      forceLipResetRef.current = true
      lipPhaseRef.current = 0
    }
  }, [avatarState])

  // Blink state
  const blinkTimerRef = useRef(3.5 + Math.random() * 2)
  const blinkProgressRef = useRef(0)
  const isBlinkingRef = useRef(false)

  // Eye saccade state
  const saccadeTimerRef = useRef(0)
  const saccadeXRef = useRef(0)
  const saccadeYRef = useRef(0)

  // ── Scene setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (onModelLoaded) onModelLoaded(scene)

    const meshes = []
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        child.frustumCulled = false

        const materialName = child.material?.name?.toLowerCase() || ''
        if (child.material && !child.material.__cloned) {
          child.material = child.material.clone()
          child.material.__cloned = true
          child.material.needsUpdate = true
        }

        if (materialName.includes('hair')) {
          child.material.map = null
          child.material.color = new THREE.Color('#7d432b')
          child.material.roughness = 0.65
          child.material.metalness = 0.1
        } else if (materialName.includes('glasses_0')) {
          child.material.color = new THREE.Color('#171b20')
          child.material.roughness = 0.34
          child.material.metalness = 0.22
        } else if (materialName.includes('glasses_1')) {
          child.material.color = new THREE.Color('#f7fbff')
          child.material.transparent = true
          child.material.opacity = 0.18
          child.material.roughness = 0.08
          child.material.metalness = 0
        } else if (materialName === 'head' || materialName === 'body') {
          child.material.roughness = 0.82
          child.material.metalness = 0.02
        } else if (materialName.includes('look')) {
          child.material.roughness = 0.88
          child.material.metalness = 0.03
        }
      }
      if (child.isBone) {
        const n = child.name
        if (n === 'Head') headRef.current = child
        if (n === 'Neck') neckRef.current = child
        if (n === 'Spine') spineRef.current = child
        if (n === 'Spine2') spine2Ref.current = child
        if (n === 'LeftShoulder') leftShoulderRef.current = child
        if (n === 'RightShoulder') rightShoulderRef.current = child
        if (n === 'LeftArm') leftArmRef.current = child
        if (n === 'RightArm') rightArmRef.current = child
        if (n === 'LeftForeArm') leftForeArmRef.current = child
        if (n === 'RightForeArm') rightForeArmRef.current = child
        if (n === 'LeftEye') leftEyeRef.current = child
        if (n === 'RightEye') rightEyeRef.current = child
      }
      if (child.isSkinnedMesh && child.morphTargetInfluences && child.morphTargetDictionary) {
        meshes.push(child)
      }
    })
    setSkinnedMeshes(meshes)

    /*
    // Rotate arms downwards and keep forearms/shoulders straight to hang naturally
    if (leftShoulderRef.current)  leftShoulderRef.current.rotation.set(0, 0, 0)
    if (rightShoulderRef.current) rightShoulderRef.current.rotation.set(0, 0, 0)
    if (leftArmRef.current)      leftArmRef.current.rotation.set(0.1, -0.18, -2.95)
    if (rightArmRef.current)     rightArmRef.current.rotation.set(0.1, 0.18, 2.95)
    if (leftForeArmRef.current)  leftForeArmRef.current.rotation.set(0, 0, 0)
    if (rightForeArmRef.current) rightForeArmRef.current.rotation.set(0, 0, 0)
    */

    // Centre model horizontally; push slightly DOWN so arms fall below camera frame
    const box = new THREE.Box3().setFromObject(scene)
    const centre = box.getCenter(new THREE.Vector3())
    scene.position.x = -centre.x
    scene.position.y = -0.12
    scene.position.z = -centre.z
    scene.rotation.y = 0.65 // Rotate to face front

    // Expose to window for real-time console tuning
    window.avatarScene = scene
    window.leftArm = leftArmRef.current
    window.rightArm = rightArmRef.current
    window.leftForeArm = leftForeArmRef.current
    window.rightForeArm = rightForeArmRef.current
  }, [scene, onModelLoaded])

  // ── Animation loop ───────────────────────────────────────────────────────────
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime()
    const target = POSES[avatarState] || POSES[AVATAR_STATES.IDLE]
    const pose = poseRef.current
    // Smooth blend factor: full transition in ~0.25 s
    const k = Math.min(1.0, delta * 12)

    // 1 ── Pose lerp ──────────────────────────────────────────────────────────
    const lerpV = (a, b) => THREE.MathUtils.lerp(a, b, k)
    const lerpO = (cur, tgt) => {
      cur.x = lerpV(cur.x, tgt.x)
      cur.y = lerpV(cur.y, tgt.y)
      cur.z = lerpV(cur.z, tgt.z)
    }
    lerpO(pose.spine, target.spine)
    lerpO(pose.neck, target.neck)
    lerpO(pose.head, target.head)

    pose.browInnerUp = lerpV(pose.browInnerUp, target.browInnerUp)
    pose.browOuterUpLeft = lerpV(pose.browOuterUpLeft, target.browOuterUpLeft)
    pose.browOuterUpRight = lerpV(pose.browOuterUpRight, target.browOuterUpRight)
    pose.browDownLeft = lerpV(pose.browDownLeft, target.browDownLeft)
    pose.browDownRight = lerpV(pose.browDownRight, target.browDownRight)
    pose.eyeWideLeft = lerpV(pose.eyeWideLeft, target.eyeWideLeft)
    pose.eyeWideRight = lerpV(pose.eyeWideRight, target.eyeWideRight)
    pose.eyeSquintLeft = lerpV(pose.eyeSquintLeft, target.eyeSquintLeft)
    pose.eyeSquintRight = lerpV(pose.eyeSquintRight, target.eyeSquintRight)
    pose.cheekSquintLeft = lerpV(pose.cheekSquintLeft, target.cheekSquintLeft)
    pose.cheekSquintRight = lerpV(pose.cheekSquintRight, target.cheekSquintRight)
    pose.mouthSmileLeft = lerpV(pose.mouthSmileLeft, target.mouthSmileLeft)
    pose.mouthSmileRight = lerpV(pose.mouthSmileRight, target.mouthSmileRight)
    pose.mouthSmile = lerpV(pose.mouthSmile, target.mouthSmile)
    pose.mouthPressLeft = lerpV(pose.mouthPressLeft, target.mouthPressLeft)
    pose.mouthPressRight = lerpV(pose.mouthPressRight, target.mouthPressRight)
    pose.noseSneerLeft = lerpV(pose.noseSneerLeft, target.noseSneerLeft)
    pose.noseSneerRight = lerpV(pose.noseSneerRight, target.noseSneerRight)
    pose.eyeLookUp = lerpV(pose.eyeLookUp, target.eyeLookUp)
    pose.eyeLookOut = lerpV(pose.eyeLookOut, target.eyeLookOut)

    // 2 ── Secondary layers (breathing + micro-movements) ─────────────────────
    const breath = Math.sin(time * 0.95) * 0.0015
    const microX = Math.sin(time * 0.38) * 0.0018
    const microY = Math.cos(time * 0.27) * 0.0022
    const listeningNod = (avatarState === AVATAR_STATES.LISTENING)
      ? (Math.sin(time * 1.2566) * 0.014 + 0.014) : 0

    /*
    if (spineRef.current) {
      spineRef.current.rotation.set(
        pose.spine.x + breath,
        pose.spine.y,
        pose.spine.z,
      )
    }
    if (spine2Ref.current) {
      spine2Ref.current.rotation.x = breath * 0.5
    }
    */
    if (neckRef.current) {
      neckRef.current.rotation.set(pose.neck.x, pose.neck.y, pose.neck.z)
    }
    if (headRef.current) {
      headRef.current.rotation.set(
        pose.head.x,
        pose.head.y,
        pose.head.z,
      )
    }

    // Keep arms, forearms, and shoulders in natural downward straight poses (supports window overrides for console tuning)
    const getRot = (boneName, axis, def) => {
      const winKey = `${boneName}_${axis}`
      return window[winKey] !== undefined ? window[winKey] : def
    }
    const getScale = (boneName, axis, def) => {
      const winKey = `${boneName}_scale_${axis}`
      return window[winKey] !== undefined ? window[winKey] : def
    }
    /*
    if (leftShoulderRef.current)  leftShoulderRef.current.rotation.set(getRot('leftShoulder', 'x', 0), getRot('leftShoulder', 'y', 0), getRot('leftShoulder', 'z', 0))
    if (rightShoulderRef.current) rightShoulderRef.current.rotation.set(getRot('rightShoulder', 'x', 0), getRot('rightShoulder', 'y', 0), getRot('rightShoulder', 'z', 0))
    if (leftArmRef.current)      leftArmRef.current.rotation.set(getRot('leftArm', 'x', 0.0), getRot('leftArm', 'y', 0.0), getRot('leftArm', 'z', 2.7))
    if (rightArmRef.current)     rightArmRef.current.rotation.set(getRot('rightArm', 'x', 0.0), getRot('rightArm', 'y', 0.0), getRot('rightArm', 'z', -2.7))
    if (leftForeArmRef.current)  leftForeArmRef.current.rotation.set(getRot('leftForeArm', 'x', 0), getRot('leftForeArm', 'y', 0), getRot('leftForeArm', 'z', 0))
    if (rightForeArmRef.current) rightForeArmRef.current.rotation.set(getRot('rightForeArm', 'x', 0), getRot('rightForeArm', 'y', 0), getRot('rightForeArm', 'z', 0))
    if (leftArmRef.current)      leftArmRef.current.scale.set(getScale('leftArm', 'x', 1.0), getScale('leftArm', 'y', 1.0), getScale('leftArm', 'z', 1.0))
    if (rightArmRef.current)     rightArmRef.current.scale.set(getScale('rightArm', 'x', 1.0), getScale('rightArm', 'y', 1.0), getScale('rightArm', 'z', 1.0))
    if (leftForeArmRef.current)  leftForeArmRef.current.scale.set(getScale('leftForeArm', 'x', 1.0), getScale('leftForeArm', 'y', 1.0), getScale('leftForeArm', 'z', 1.0))
    if (rightForeArmRef.current) rightForeArmRef.current.scale.set(getScale('rightForeArm', 'x', 1.0), getScale('rightForeArm', 'y', 1.0), getScale('rightForeArm', 'z', 1.0))
    */

    // 3 ── Eye saccades (using bone rotation) ─────────────────────────────────
    saccadeTimerRef.current += delta
    if (saccadeTimerRef.current > 3.0 + Math.random() * 2.5) {
      saccadeTimerRef.current = 0
      if (Math.random() > 0.75) {
        saccadeXRef.current = (Math.random() - 0.5) * 0.004
        saccadeYRef.current = (Math.random() - 0.5) * 0.005
      } else {
        saccadeXRef.current = 0
        saccadeYRef.current = 0
      }
    }
    if (leftEyeRef.current) {
      leftEyeRef.current.rotation.x = saccadeXRef.current
      leftEyeRef.current.rotation.y = saccadeYRef.current
    }
    if (rightEyeRef.current) {
      rightEyeRef.current.rotation.x = saccadeXRef.current
      rightEyeRef.current.rotation.y = saccadeYRef.current
    }

    // 4 ── Blink (every 3–5 s, 0.16 s duration) ───────────────────────────────
    blinkTimerRef.current -= delta
    if (!isBlinkingRef.current && blinkTimerRef.current <= 0) {
      isBlinkingRef.current = true
      blinkProgressRef.current = 0
      blinkTimerRef.current = 3.0 + Math.random() * 2.5
    }

    let blinkW = 0
    if (isBlinkingRef.current) {
      blinkProgressRef.current += delta
      const p = blinkProgressRef.current
      if (p < 0.08) blinkW = p / 0.08
      else if (p < 0.16) blinkW = 1 - (p - 0.08) / 0.08
      else { isBlinkingRef.current = false; blinkW = 0 }
    }

    // 5 ── Lip sync (speaking only) ───────────────────────────────────────────
    let jawW = 0, mouthOpenW = 0, funnelW = 0, puckerW = 0
    let lowerDownW = 0, upperUpW = 0, rollLowerW = 0

    // Viseme weights — procedural cycling through vowel shapes
    let viseme_aa = 0, viseme_O = 0, viseme_E = 0, viseme_U = 0
    let viseme_PP = 0, viseme_FF = 0, viseme_TH = 0, viseme_DD = 0

    let targetVol = 0
    if (avatarState === AVATAR_STATES.SPEAKING) {
      const liveVol = getSpeechVolume()
      if (liveVol > 0.02) {
        targetVol = Math.min(0.85, liveVol * 0.90)
      } else {
        // Procedural fallback with smooth soft-threshold
        lipPhaseRef.current += delta * 6.5
        const p = lipPhaseRef.current
        const raw = (
          Math.abs(Math.sin(p) * 0.45) +
          Math.abs(Math.sin(p * 1.7) * 0.28) +
          Math.abs(Math.sin(p * 0.5) * 0.12)
        )
        targetVol = Math.min(0.75, raw * raw * 1.1)
      }
    }

    // Smoothly interpolate the volume to reduce high-frequency jitter
    const volK = Math.min(1.0, delta * 12)
    smoothedVolRef.current = THREE.MathUtils.lerp(smoothedVolRef.current, targetVol, volK)
    const vol = smoothedVolRef.current

    if (vol > 0.01) {
      // Jaw & mouth opening
      jawW = vol * 0.56
      mouthOpenW = vol * 0.48

      // Lips shape variety using a slow cycle
      const lipCycle = (time * 2.8) % (Math.PI * 2)
      funnelW = Math.max(0, Math.sin(lipCycle)) * vol * 0.24
      puckerW = Math.max(0, Math.sin(lipCycle + Math.PI)) * vol * 0.12
      lowerDownW = Math.abs(Math.sin(lipCycle * 1.3)) * vol * 0.26
      upperUpW = Math.abs(Math.cos(lipCycle * 0.9)) * vol * 0.18
      rollLowerW = Math.max(0, Math.sin(lipCycle * 2.1)) * vol * 0.13

      // Viseme cycling — smooth transitions between vowel visemes
      const vt = (time * 3.2) % (Math.PI * 2)
      viseme_aa = Math.max(0, Math.sin(vt)) * vol * 0.42
      viseme_O = Math.max(0, Math.sin(vt + Math.PI * 0.5)) * vol * 0.35
      viseme_E = Math.max(0, Math.sin(vt + Math.PI)) * vol * 0.30
      viseme_U = Math.max(0, Math.sin(vt + Math.PI * 1.5)) * vol * 0.24
      viseme_PP = Math.max(0, Math.sin(time * 7.2) - 0.72) * vol * 0.42
      viseme_FF = Math.max(0, Math.sin(time * 5.4 + 1.1) - 0.78) * vol * 0.28
      viseme_TH = Math.max(0, Math.sin(time * 4.9 + 2.4) - 0.84) * vol * 0.22
      viseme_DD = Math.max(0, Math.sin(time * 6.1 + 0.5) - 0.82) * vol * 0.20
    } else {
      jawW = 0; mouthOpenW = 0; funnelW = 0; puckerW = 0
      lowerDownW = 0; upperUpW = 0; rollLowerW = 0
      viseme_aa = 0; viseme_O = 0; viseme_E = 0
      viseme_U = 0; viseme_PP = 0; viseme_FF = 0
      viseme_TH = 0; viseme_DD = 0
    }

    const lip = lipWeightsRef.current
    if (forceLipResetRef.current) {
      // Hard reset all lip positions instantly when interrupted
      lip.jawW = 0
      lip.mouthOpenW = 0
      lip.funnelW = 0
      lip.puckerW = 0
      lip.lowerDownW = 0
      lip.upperUpW = 0
      lip.rollLowerW = 0
      lip.viseme_aa = 0
      lip.viseme_O = 0
      lip.viseme_E = 0
      lip.viseme_U = 0
      lip.viseme_PP = 0
      lip.viseme_FF = 0
      lip.viseme_TH = 0
      lip.viseme_DD = 0
      smoothedVolRef.current = 0
      forceLipResetRef.current = false
    } else {
      const lipK = avatarState === AVATAR_STATES.SPEAKING ? Math.min(1, delta * 18) : Math.min(1, delta * 30)
      lip.jawW = lerpV(lip.jawW, jawW, lipK)
      lip.mouthOpenW = lerpV(lip.mouthOpenW, mouthOpenW, lipK)
      lip.funnelW = lerpV(lip.funnelW, funnelW, lipK)
      lip.puckerW = lerpV(lip.puckerW, puckerW, lipK)
      lip.lowerDownW = lerpV(lip.lowerDownW, lowerDownW, lipK)
      lip.upperUpW = lerpV(lip.upperUpW, upperUpW, lipK)
      lip.rollLowerW = lerpV(lip.rollLowerW, rollLowerW, lipK)
      lip.viseme_aa = lerpV(lip.viseme_aa, viseme_aa, lipK)
      lip.viseme_O = lerpV(lip.viseme_O, viseme_O, lipK)
      lip.viseme_E = lerpV(lip.viseme_E, viseme_E, lipK)
      lip.viseme_U = lerpV(lip.viseme_U, viseme_U, lipK)
      lip.viseme_PP = lerpV(lip.viseme_PP, viseme_PP, lipK)
      lip.viseme_FF = lerpV(lip.viseme_FF, viseme_FF, lipK)
      lip.viseme_TH = lerpV(lip.viseme_TH, viseme_TH, lipK)
      lip.viseme_DD = lerpV(lip.viseme_DD, viseme_DD, lipK)
    }

    // 6 ── Apply all morph targets ─────────────────────────────────────────────
    skinnedMeshes.forEach((mesh) => {
      const d = mesh.morphTargetDictionary
      const inf = mesh.morphTargetInfluences
      if (!d || !inf) return

      const set = (name, val) => {
        const idx = d[name]
        if (idx !== undefined) inf[idx] = Math.max(0, Math.min(1, val))
      }

      // ── Blink ──
      set('eyeBlinkLeft', blinkW)
      set('eyeBlinkRight', blinkW)
      set('eyesClosed', blinkW * 0.6)

      // ── Brow ──
      set('browInnerUp', pose.browInnerUp)
      set('browOuterUpLeft', pose.browOuterUpLeft)
      set('browOuterUpRight', pose.browOuterUpRight)
      set('browDownLeft', pose.browDownLeft)
      set('browDownRight', pose.browDownRight)

      // ── Eyes ──
      set('eyeWideLeft', pose.eyeWideLeft)
      set('eyeWideRight', pose.eyeWideRight)
      set('eyeSquintLeft', pose.eyeSquintLeft)
      set('eyeSquintRight', pose.eyeSquintRight)

      // ── Eye look direction (for THINKING gaze) ──
      set('eyeLookUpLeft', pose.eyeLookUp)
      set('eyeLookUpRight', pose.eyeLookUp)
      set('eyesLookUp', pose.eyeLookUp)
      set('eyeLookOutLeft', pose.eyeLookOut)
      set('eyeLookOutRight', pose.eyeLookOut)

      // ── Cheek ──
      set('cheekSquintLeft', pose.cheekSquintLeft)
      set('cheekSquintRight', pose.cheekSquintRight)

      // ── Smile / mouth pose ──
      set('mouthSmileLeft', pose.mouthSmileLeft)
      set('mouthSmileRight', pose.mouthSmileRight)
      set('mouthSmile', pose.mouthSmile)
      set('mouthPressLeft', pose.mouthPressLeft)
      set('mouthPressRight', pose.mouthPressRight)

      // ── Nose ──
      set('noseSneerLeft', pose.noseSneerLeft)
      set('noseSneerRight', pose.noseSneerRight)

      // ── Lip sync morphs ──
      set('jawOpen', lip.jawW)
      set('mouthOpen', lip.mouthOpenW)
      set('mouthFunnel', lip.funnelW)
      set('mouthPucker', lip.puckerW)
      set('mouthLowerDownLeft', lip.lowerDownW)
      set('mouthLowerDownRight', lip.lowerDownW)
      set('mouthUpperUpLeft', lip.upperUpW)
      set('mouthUpperUpRight', lip.upperUpW)
      set('mouthRollLower', lip.rollLowerW)

      // ── Visemes ──
      set('viseme_aa', lip.viseme_aa)
      set('viseme_O', lip.viseme_O)
      set('viseme_E', lip.viseme_E)
      set('viseme_U', lip.viseme_U)
      set('viseme_PP', lip.viseme_PP)
      set('viseme_FF', lip.viseme_FF)
      set('viseme_TH', lip.viseme_TH)
      set('viseme_DD', lip.viseme_DD)
      // Keep others silent
      set('viseme_sil', lip.jawW < 0.05 ? 1 : 0)
    })
  })

  return <primitive object={scene} />
}

// ─── Preload ──────────────────────────────────────────────────────────────────
useGLTF.preload('/model.glb')

// ─── Static configuration for Canvas ──────────────────────────────────────────
const CANVAS_CAMERA_CONFIG = { fov: 40 }
const CANVAS_GL_CONFIG = {
  antialias: true,
  toneMapping: THREE.ACESFilmicToneMapping,
  toneMappingExposure: 1.16,
  outputColorSpace: THREE.SRGBColorSpace,
}
const CANVAS_STYLE = { background: 'transparent' }

// ─── Main panel component ─────────────────────────────────────────────────────
export default function AvatarPanel({ avatarState = AVATAR_STATES.IDLE, avatarUrl = null, showControls = true }) {
  const config = STATE_CONFIG[avatarState] || STATE_CONFIG[AVATAR_STATES.IDLE]
  const envUrl = import.meta.env.VITE_AVATAR_URL || null
  const url = avatarUrl || envUrl

  const [modelScene, setModelScene] = useState(null)
  const [loading, setLoading] = useState(true)

  const handleModelLoaded = useCallback((sc) => {
    setModelScene(sc)
    setLoading(false)
  }, [])

  // Get theme status safely
  let isDark = true
  try {
    const theme = useTheme()
    isDark = theme.isDark
  } catch (e) {
    // fallback if theme provider not present
  }
  const isNight = isDark

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-dark-900 rounded-2xl overflow-hidden shadow-2xl">
      <div className={clsx(
        'relative w-full h-full rounded-2xl overflow-hidden ring-4 transition-all duration-500',
        config.ring,
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
            {/* Day gradient background */}
            <div
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{
                background: 'linear-gradient(135deg, #8f93a3 0%, #676d81 52%, #535c72 100%)',
                opacity: isNight ? 0 : 1,
              }}
            />
            {/* Night gradient background */}
            <div
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{
                background: 'linear-gradient(135deg, #090d16 0%, #111827 52%, #1e1b4b 100%)',
                opacity: isNight ? 1 : 0,
              }}
            />

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 bg-dark-800/80 flex flex-col items-center justify-center z-10">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
                <span className="text-gray-300 text-sm font-semibold">Preparing 3D Interviewer…</span>
              </div>
            )}

            <Canvas
              shadows
              camera={CANVAS_CAMERA_CONFIG}
              gl={CANVAS_GL_CONFIG}
              style={CANVAS_STYLE}
            >
              {/* Studio lighting */}
              <ambientLight intensity={isNight ? 0.28 : 0.78} />

              {/* Key light — soft frontal */}
              <directionalLight
                position={[0.15, 1.9, 1.6]}
                intensity={isNight ? 0.52 : 1.35}
                color={isNight ? '#93c5fd' : '#ffffff'}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-bias={-0.0001}
              />

              {/* Fill light — opposing soft fill */}
              <directionalLight
                position={[-1.1, 1.1, 1.0]}
                intensity={isNight ? 0.22 : 0.68}
                color={isNight ? '#3b82f6' : '#ffffff'}
              />

              {/* Rim light — cool edge separation */}
              <directionalLight
                position={[0, 2.4, -1.8]}
                intensity={isNight ? 2.1 : 1.45}
                color={isNight ? '#d8b4fe' : '#e9efff'}
              />

              {/* Warm under-fill — adds depth to face */}
              <pointLight
                position={[0, -0.5, 0.8]}
                intensity={isNight ? 0.45 : 0.3}
                color={isNight ? '#6366f1' : '#ffe8d0'}
              />

              <Suspense fallback={null}>
                <AvatarModel avatarState={avatarState} onModelLoaded={handleModelLoaded} />
                <CameraController modelScene={modelScene} />
              </Suspense>
            </Canvas>
          </AvatarErrorBoundary>
        )}

        {/* Day bottom vignette */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none z-10 transition-opacity duration-700 ease-in-out"
          style={{
            height: '15%',
            background: 'linear-gradient(to top, #535c72 0%, transparent 100%)',
            opacity: isNight ? 0 : 1,
          }}
        />
        {/* Night bottom vignette */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none z-10 transition-opacity duration-700 ease-in-out"
          style={{
            height: '15%',
            background: 'linear-gradient(to top, #1e1b4b 0%, transparent 100%)',
            opacity: isNight ? 1 : 0,
          }}
        />

        {/* Speaking waveform — sits above the vignette */}
        {showControls && avatarState === AVATAR_STATES.SPEAKING && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-8 z-20">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="wave-bar w-1.5" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}
      </div>

      {/* Status badge */}
      {showControls && <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm bg-dark-800/80 border border-white/10">
        <div className={clsx('w-2 h-2 rounded-full', config.color, config.pulse && 'animate-pulse')} />
        <span className={clsx('text-xs font-semibold', config.text)}>{config.label}</span>
      </div>}
    </div>
  )
}

// ─── CSS fallback avatar ───────────────────────────────────────────────────────
function FallbackAvatar({ avatarState, config }) {
  const isSpeaking = avatarState === AVATAR_STATES.SPEAKING
  const isListening = avatarState === AVATAR_STATES.LISTENING
  const isThinking = avatarState === AVATAR_STATES.THINKING
  const isPreparing = avatarState === AVATAR_STATES.PREPARING

  return (
    <div className="w-full h-full bg-gradient-to-b from-dark-600 to-dark-800 flex flex-col items-center justify-center relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(109,95,232,0.12)_0%,transparent_70%)]" />

      <div className={clsx(
        'relative transition-all duration-300',
        isSpeaking && 'scale-105',
        (isThinking || isPreparing) && 'translate-y-1',
      )}>
        {/* Head */}
        <div className={clsx(
          'w-28 h-28 rounded-full bg-gradient-to-b from-amber-200 to-amber-300 mx-auto relative shadow-2xl',
          isSpeaking && 'animate-bounce-slow',
        )}>
          {/* Eyes */}
          <div className="absolute top-8 left-6 right-6 flex justify-between">
            {[0, 1].map(i => (
              <div key={i} className={clsx(
                'w-4 h-4 bg-gray-800 rounded-full relative overflow-hidden',
                !isSpeaking && 'animate-[blink_4s_ease-in-out_infinite]',
              )} style={{ animationDelay: i ? '0.1s' : '0s' }}>
                <div className="absolute inset-1 bg-dark-900 rounded-full" />
                <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            ))}
          </div>
          {/* Mouth */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            {isSpeaking ? (
              <div className="w-8 h-4 border-2 border-gray-700 rounded-full bg-red-900/40 animate-pulse" />
            ) : isListening ? (
              <div className="w-6 h-2 border-b-2 border-gray-700 rounded-b-full" />
            ) : (
              <div className="w-8 h-1 bg-gray-600 rounded-full" />
            )}
          </div>
          {/* Thinking/Preparing dots */}
          {(isThinking || isPreparing) && (
            <div className="absolute -top-2 -right-2 flex gap-0.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          )}
        </div>

        {/* Neck + torso */}
        <div className="w-10 h-6 bg-amber-200 mx-auto" />
        <div className="w-44 h-28 bg-gradient-to-b from-primary-700 to-primary-800 rounded-t-3xl mx-auto -mt-1 flex items-center justify-center shadow-xl">
          <div className="w-8 h-16 bg-primary-500 rounded-b-lg opacity-60" />
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-dark-700/90 border border-white/10 rounded-xl px-4 py-2 text-center backdrop-blur-sm">
        <p className="text-white text-sm font-bold">AI Interviewer</p>
        <p className={clsx('text-xs font-medium', config.text)}>{config.label}…</p>
      </div>
    </div>
  )
}
