import './styles/style.css'
import * as THREE from 'three'

// Canvas and Scene
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
scene.background = new THREE.Color('#F0EEE6') // Changed background color

// Sizes and Camera (move camera farther to shrink the sphere)
const sizes = { width: window.innerWidth, height: window.innerHeight }
const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 1, 2000)
camera.position.z = 250
scene.add(camera)

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true })
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Handle window resize
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Create a group to hold the entire sphere of dots and lines
const sphereGroup = new THREE.Group()
// Move the group to the right side (adjust the x value as desired)
sphereGroup.position.set(95, 0, 0)
scene.add(sphereGroup)

// ----- DOTS SETUP ----- //
const dots = []
const dotCount = 1000      // More dots
const containerRadius = 80 // Radius of the sphere that contains all dots

// Updated color palette: range of browns including #D97757
const colorOptions = [0xD97757, 0xA0522D, 0xCD853F, 0x8B4513]

// Function to generate a random point uniformly inside a sphere
function randomPointInSphere(radius) {
  const u = Math.random()
  const v = Math.random()
  const theta = 2 * Math.PI * u
  const phi = Math.acos(2 * v - 1)
  const r = radius * Math.cbrt(Math.random())
  const sinPhi = Math.sin(phi)
  return new THREE.Vector3(
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  )
}

for (let i = 0; i < dotCount; i++) {
  // Create a dot at a random point inside the sphere
  const pos = randomPointInSphere(containerRadius)

  // Random size between 0.5 and 1.5 units
  const size = Math.random() + 0.5
  const geometry = new THREE.SphereGeometry(size, 8, 8)
  const color = colorOptions[Math.floor(Math.random() * colorOptions.length)]
  const material = new THREE.MeshBasicMaterial({ color: color })
  const dot = new THREE.Mesh(geometry, material)
  dot.position.copy(pos)

  // Save properties: original scale, enlargement timer, and a slow random velocity
  dot.userData = {
    originalSize: 1,
    enlargedUntil: 0,
    velocity: new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05
    )
  }

  sphereGroup.add(dot)
  dots.push(dot)
}

// ----- LINES BETWEEN DOTS ----- //
let lineMesh = null
function updateLines() {
  if (lineMesh) {
    sphereGroup.remove(lineMesh)
    lineMesh.geometry.dispose()
  }

  const positionsArray = []
  const linkThreshold = 15 // adjust threshold for linking dots

  for (let i = 0; i < dots.length; i++) {
    for (let j = i + 1; j < dots.length; j++) {
      const pos1 = dots[i].position
      const pos2 = dots[j].position
      const distance = pos1.distanceTo(pos2)
      if (distance < linkThreshold) {
        positionsArray.push(pos1.x, pos1.y, pos1.z, pos2.x, pos2.y, pos2.z)
      }
    }
  }

  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positionsArray, 3))
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x444444,
    transparent: true,
    opacity: 0.3
  })
  lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial)
  sphereGroup.add(lineMesh)
}

// ----- MOUSE INTERACTION ----- //
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
document.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
})

// ----- ANIMATION LOOP ----- //
const clock = new THREE.Clock()

function animate() {
  const currentTime = performance.now()

  // Update each dot's position and bounce off the spherical boundary
  dots.forEach(dot => {
    dot.position.add(dot.userData.velocity)
    // Bounce off the spherical boundary
    if (dot.position.length() > containerRadius) {
      const n = dot.position.clone().normalize()
      const v = dot.userData.velocity
      const dotProduct = v.dot(n)
      const reflection = n.multiplyScalar(2 * dotProduct)
      dot.userData.velocity.sub(reflection)
      dot.position.setLength(containerRadius - 0.1)
    }
  })

  // Raycasting: detect mouse hover over dots and enlarge them
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(dots)
  intersects.forEach(intersect => {
    const dot = intersect.object
    if (dot.scale.x < 2.0) { // if not already enlarged
      dot.scale.set(2.5, 2.5, 2.5)  // enlarge to roughly 2.5× original size
      dot.userData.enlargedUntil = currentTime + 2000 + Math.random() * 1000 // 2–3 seconds
    }
  })

  // For each dot, if its enlargement period has passed, gradually return it to normal scale
  dots.forEach(dot => {
    if (currentTime > dot.userData.enlargedUntil) {
      dot.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05)
    }
  })

  // Update the linking lines
  updateLines()

  // Instead of looking at sphereGroup.position, we now look at the center of the scene.
  camera.lookAt(new THREE.Vector3(0, 0, 0))

  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

animate()
