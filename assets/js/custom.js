// Bundled JS file is used instead of this. 
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BufferGeometry,
  Float32BufferAttribute,
  PointsMaterial,
  Points,
} from "three";

document.addEventListener("DOMContentLoaded", function () {
  const scene = new Scene();
  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  const renderer = new WebGLRenderer({ alpha: true });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.position = "fixed";
  renderer.domElement.style.top = "0";
  renderer.domElement.style.left = "0";
  renderer.domElement.style.zIndex = "-1";
  document.body.appendChild(renderer.domElement);

  function createStars() {
    const starGeometry = new BufferGeometry();
    const starVertices = [];
    
    for (let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 10;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 10;
      starVertices.push(x, y, z);
    }
    
    starGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(starVertices, 3)
    );
    
    const starMaterial = new PointsMaterial({
      color: 0xffffff,
      size: 0.015,
      transparent: true,
      opacity: 0.3,
    });
    
    const stars = new Points(starGeometry, starMaterial);
    scene.add(stars);
    return stars;
  }
  
  const stars = createStars();
  camera.position.z = 5;

  function animate() {
    requestAnimationFrame(animate);
    stars.rotation.y += 0.001;
    stars.rotation.x += 0.0005;
    renderer.render(scene, camera);
  }
  
  animate();

  // Mouse parallax effect
  document.addEventListener("mousemove", (event) => {
    let x = (event.clientX / window.innerWidth - 0.5) * 2;
    let y = -(event.clientY / window.innerHeight - 0.5) * 2;
    camera.rotation.y = x * 0.1;
    camera.rotation.x = y * 0.1;
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
});
