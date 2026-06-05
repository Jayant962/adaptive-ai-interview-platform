// inspect_glb.js — run with: node inspect_glb.js
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const glbPath = resolve(__dirname, 'public/model.glb')

const buf = readFileSync(glbPath)
const magic = buf.readUInt32LE(0)
if (magic !== 0x46546C67) { console.error('Not a GLB file'); process.exit(1) }

const jsonLength = buf.readUInt32LE(12)
const jsonStr = buf.slice(20, 20 + jsonLength).toString('utf8')
const gltf = JSON.parse(jsonStr)

console.log('\n========== NODES (Bones / Meshes) ==========')
;(gltf.nodes || []).forEach((n, i) => {
  const tag = (gltf.skins || []).some(s => s.joints?.includes(i)) ? '[BONE]' : '[NODE]'
  console.log(`  ${i}: ${tag} "${n.name}"`)
})

console.log('\n========== MESHES & MORPH TARGETS ==========')
;(gltf.meshes || []).forEach((mesh, mi) => {
  console.log(`\n  Mesh ${mi}: "${mesh.name}"`)
  ;(mesh.primitives || []).forEach((prim, pi) => {
    const targets = prim.targets || []
    const names = mesh.extras?.targetNames || []
    if (targets.length > 0) {
      console.log(`    Primitive ${pi} — ${targets.length} morph targets:`)
      targets.forEach((_, ti) => {
        const name = names[ti] || `target_${ti}`
        console.log(`      [${ti}] "${name}"`)
      })
    } else {
      console.log(`    Primitive ${pi} — no morph targets`)
    }
  })
})

console.log('\n========== MATERIALS ==========')
;(gltf.materials || []).forEach((mat, mi) => {
  console.log(`  Material ${mi}: "${mat.name}"`)
})

console.log('\n========== ANIMATIONS ==========')
console.log(`  Number of animations: ${(gltf.animations || []).length}`)
;(gltf.animations || []).forEach((anim, ai) => {
  console.log(`  Animation ${ai}: "${anim.name || 'unnamed'}"`)
})


