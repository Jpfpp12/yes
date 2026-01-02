import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function placeholderFromExtension(ext: string, fileSizeMB: string): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 200;
  canvas.height = 200;
  if (!ctx)
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#444444";
  ctx.font = "bold 20px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText((ext || "").toUpperCase(), canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = "#666666";
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.fillText(`${fileSizeMB} MB`, canvas.width / 2, canvas.height / 2 + 24);
  return canvas.toDataURL("image/png");
}

export async function generateThumbnail(
  file: File,
  previewUrl?: string | null,
  fileType?: string | null,
): Promise<string> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);

  // If we don't have a preview URL or unsupported type, return placeholder
  const supported =
    (fileType || ext) &&
    ["stl", "gltf", "glb"].includes((fileType || ext) as string);
  if (!previewUrl || !supported) {
    return placeholderFromExtension(ext, sizeMB);
  }

  try {
    // Prepare renderer and scene
    const width = 600;
    const height = 600;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 5000);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.setClearColor("#f5f5f5", 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0xffffff, 0xe5e5e5, 0.25);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-5, 3, 2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(5, -3, -5);
    scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);

    const partColor = new THREE.Color("#444444");

    const loadSTL = async () => {
      const loader = new STLLoader();
      const geometry: THREE.BufferGeometry = await new Promise(
        (resolve, reject) =>
          loader.load(previewUrl, resolve, undefined, reject),
      );
      const material = new THREE.MeshStandardMaterial({
        color: partColor,
        metalness: 0.1,
        roughness: 0.8,
      });
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);
      geometry.computeBoundingBox();
      return mesh as THREE.Object3D;
    };

    const loadGLTF = async () => {
      const loader = new GLTFLoader();
      const gltf: any = await new Promise((resolve, reject) =>
        loader.load(previewUrl, resolve, undefined, reject),
      );
      const root: THREE.Object3D = gltf.scene || gltf.scenes?.[0];
      root.traverse((obj: any) => {
        if (obj.isMesh) {
          if (obj.material) {
            obj.material = new THREE.MeshStandardMaterial({
              color: partColor,
              metalness: 0.1,
              roughness: 0.8,
            });
          }
          obj.castShadow = false;
          obj.receiveShadow = false;
        }
      });
      group.add(root);
      return root;
    };

    const type = (fileType || ext) as string;
    const obj = type === "stl" ? await loadSTL() : await loadGLTF();

    // Fit camera
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    group.position.sub(center); // center model at origin

    const radius = new THREE.Vector3(size.x, size.y, size.z).length() / 2; // bounding sphere approx
    const fov = camera.fov * (Math.PI / 180);
    const fovH = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect);

    // 1mm margin on each side -> convert to pixels (approx 96dpi => ~3.78px); we choose 4px
    const marginPx = 4;
    const usableW = width - 2 * marginPx;
    const usableH = height - 2 * marginPx;
    const scaleW = width / usableW;
    const scaleH = height / usableH;

    const distV = radius / Math.sin(fov / 2);
    const distH = radius / Math.sin(fovH / 2);
    let distance = Math.max(distV, distH);
    distance *= Math.max(scaleW, scaleH); // apply margin scaling

    // isometric angle for better visualization
    const dir = new THREE.Vector3(1, 1, 1).normalize();
    camera.position.copy(dir.multiplyScalar(distance));
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // slight tilt for better view
    const controlsTarget = new THREE.Vector3(0, 0, 0);
    camera.up.set(0, 1, 0);

    // wait a bit to ensure everything settles, then render
    await new Promise((r) => setTimeout(r, 200));
    renderer.render(scene, camera);

    const dataUrl = renderer.domElement.toDataURL("image/png");

    // Cleanup
    try {
      renderer.dispose();
    } catch {}
    try {
      (obj as any).traverse?.(
        (o: any) => o.geometry?.dispose?.() || o.material?.dispose?.(),
      );
    } catch {}

    return dataUrl;
  } catch (e) {
    return placeholderFromExtension(ext, sizeMB);
  }
}
