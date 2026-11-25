import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export interface RailDistortionSlotUniform {
  center: THREE.Vector2;
  /** [radius, thickness, intensity, chromatic] */
  params: THREE.Vector4;
}

/**
 * Localized screen-space refractive shockwave shader for high-caliber Rail Cannon
 * hull plate impacts. Applies crisp radial lens displacement, subtle acoustic
 * trailing compression, restrained chromatic dispersion, and a fine specular
 * wavefront glint strictly around the projected impact point.
 */
export function createRailImpactDistortionShaderConfig(discardOutside = false) {
  return {
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      uAspect: { value: 16 / 9 },
      uCenter0: { value: new THREE.Vector2(0.5, 0.5) },
      uParams0: { value: new THREE.Vector4(0, 0.03, 0, 0) },
      uCenter1: { value: new THREE.Vector2(0.5, 0.5) },
      uParams1: { value: new THREE.Vector4(0, 0.03, 0, 0) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uAspect;
      uniform vec2 uCenter0;
      uniform vec4 uParams0; // x: radius, y: thickness, z: intensity, w: chromatic
      uniform vec2 uCenter1;
      uniform vec4 uParams1;
      varying vec2 vUv;

      bool evaluateShockwave(
        vec2 uv,
        vec2 center,
        vec4 params,
        inout vec2 totalOffset,
        inout vec2 totalChromaDir,
        inout float totalHighlight
      ) {
        float intensity = params.z;
        if (intensity <= 0.0004) return false;

        float radius = max(0.001, params.x);
        float thickness = max(0.008, params.y);
        float chroma = params.w;

        vec2 rawDelta = uv - center;
        vec2 aspectDelta = vec2(rawDelta.x * uAspect, rawDelta.y);
        float dist = length(aspectDelta);

        // Strictly localized envelope around the expanding supersonic shockwave ring
        float maxReach = radius + thickness * 2.1;
        if (dist > maxReach) return false;

        vec2 dir = dist > 0.0001 ? aspectDelta / dist : vec2(0.0, 1.0);
        float signedBand = (dist - radius) / thickness;

        // Sharp supersonic compression lens crest + smooth damped inner refraction
        float crestEnv = exp(-signedBand * signedBand * 2.4);
        float waveDisp = -sin(signedBand * 3.14159) * crestEnv;

        float interiorMask = smoothstep(radius + thickness * 0.25, 0.0, dist);
        float interiorRipple = sin((radius - dist) * 24.0) * 0.14 * interiorMask * smoothstep(0.0, radius * 0.85, dist);

        float dispScalar = (waveDisp + interiorRipple) * intensity;
        vec2 uvDir = vec2(dir.x / uAspect, dir.y);
        totalOffset += uvDir * dispScalar;
        totalChromaDir += uvDir * (crestEnv * intensity * chroma * 0.28);

        // Razor-thin kinetic refractive rim sheen strictly along the shock crest (no milky halo)
        float rimBand = exp(-signedBand * signedBand * 11.5);
        totalHighlight += rimBand * intensity * 4.4;
        return true;
      }

      void main() {
        vec2 offset = vec2(0.0);
        vec2 chromaShift = vec2(0.0);
        float rimHighlight = 0.0;

        bool hit0 = evaluateShockwave(vUv, uCenter0, uParams0, offset, chromaShift, rimHighlight);
        bool hit1 = evaluateShockwave(vUv, uCenter1, uParams1, offset, chromaShift, rimHighlight);
        ${discardOutside ? 'if (!hit0 && !hit1) discard;' : ''}

        vec2 warpedUv = clamp(vUv + offset, vec2(0.001), vec2(0.999));

        vec4 baseSample = texture2D(tDiffuse, warpedUv);
        vec3 color = baseSample.rgb;

        float chromaLen = length(chromaShift);
        if (chromaLen > 0.00012) {
          vec2 uvR = clamp(warpedUv + chromaShift, vec2(0.001), vec2(0.999));
          vec2 uvB = clamp(warpedUv - chromaShift, vec2(0.001), vec2(0.999));
          color.r = texture2D(tDiffuse, uvR).r;
          color.b = texture2D(tDiffuse, uvB).b;
        }

        // Subtle crisp optical refraction glint on the shockwave crest
        if (rimHighlight > 0.001) {
          vec3 shockTint = mix(vec3(0.74, 0.91, 1.0), vec3(1.0, 0.9, 0.76), clamp(rimHighlight * 1.4, 0.0, 1.0));
          color += shockTint * min(0.14, rimHighlight);
        }

        gl_FragColor = vec4(color, baseSample.a);
      }
    `,
  };
}

export interface RailDistortionBlitHelper {
  material: THREE.ShaderMaterial;
  renderWithDistortion: (
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) => void;
  setSize: (width: number, height: number, pixelRatio: number) => void;
  syncUniforms: (
    aspect: number,
    slot0: RailDistortionSlotUniform,
    slot1: RailDistortionSlotUniform,
  ) => void;
  dispose: () => void;
}

/**
 * Creates a Three.js ShaderPass for hardware GPU EffectComposer pipelines.
 */
export function createRailDistortionShaderPass(): ShaderPass {
  const pass = new ShaderPass(createRailImpactDistortionShaderConfig(false));
  pass.enabled = false;
  return pass;
}

/**
 * Syncs uniform values onto a ShaderPass cleanly.
 */
export function syncRailDistortionPassUniforms(
  pass: ShaderPass,
  aspect: number,
  slot0: RailDistortionSlotUniform,
  slot1: RailDistortionSlotUniform,
  active: boolean,
): void {
  pass.enabled = active;
  const u = pass.uniforms;
  u.uAspect.value = aspect;
  (u.uCenter0.value as THREE.Vector2).copy(slot0.center);
  (u.uParams0.value as THREE.Vector4).copy(slot0.params);
  (u.uCenter1.value as THREE.Vector2).copy(slot1.center);
  (u.uParams1.value as THREE.Vector4).copy(slot1.params);
}

/**
 * Zero-idle-cost direct-render distortion overlay used when EffectComposer is disabled
 * (e.g., mobile GPUs or software WebGL). Renders the scene directly to the native canvas
 * (preserving 100% identical ACES tone mapping, sRGB color space, and MSAA), copies the
 * backbuffer into a FramebufferTexture only during the ~0.45s rail impact window, and
 * shades strictly the localized shockwave pixels (discarding outside pixels).
 */
export function createRailDistortionBlitHelper(
  width: number,
  height: number,
  pixelRatio: number,
): RailDistortionBlitHelper {
  let texW = Math.max(2, Math.floor(width * pixelRatio));
  let texH = Math.max(2, Math.floor(height * pixelRatio));

  const createFbTexture = (w: number, h: number) => {
    const tex = new THREE.FramebufferTexture(w, h);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.NoColorSpace;
    return tex;
  };

  let fbTexture = createFbTexture(texW, texH);
  const drawingSize = new THREE.Vector2();

  const cfg = createRailImpactDistortionShaderConfig(true);
  const material = new THREE.ShaderMaterial({
    uniforms: cfg.uniforms,
    vertexShader: cfg.vertexShader,
    fragmentShader: cfg.fragmentShader,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });

  const quadScene = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const quadMesh = new THREE.Mesh(quadGeo, material);
  quadMesh.frustumCulled = false;
  quadScene.add(quadMesh);

  return {
    material,
    renderWithDistortion: (renderer, scene, camera) => {
      // 1. Render 3D scene directly to canvas with native ACES tone mapping & sRGB output
      renderer.render(scene, camera);

      // 2. Ensure FramebufferTexture matches exact physical drawing buffer dimensions
      renderer.getDrawingBufferSize(drawingSize);
      const dw = Math.max(2, Math.floor(drawingSize.x));
      const dh = Math.max(2, Math.floor(drawingSize.y));
      if (dw !== texW || dh !== texH) {
        fbTexture.dispose();
        texW = dw;
        texH = dh;
        fbTexture = createFbTexture(texW, texH);
      }

      // 3. Copy rendered canvas backbuffer into FramebufferTexture (exact pixel parity, zero gamma shift)
      renderer.copyFramebufferToTexture(fbTexture);

      // 4. Composite localized distortion strictly inside the shockwave radius (discard outside)
      const prevAutoClear = renderer.autoClear;
      renderer.autoClear = false;
      material.uniforms.tDiffuse.value = fbTexture;
      renderer.render(quadScene, quadCamera);
      renderer.autoClear = prevAutoClear;
    },
    setSize: (w, h, dpr) => {
      const nw = Math.max(2, Math.floor(w * dpr));
      const nh = Math.max(2, Math.floor(h * dpr));
      if (nw !== texW || nh !== texH) {
        fbTexture.dispose();
        texW = nw;
        texH = nh;
        fbTexture = createFbTexture(texW, texH);
      }
    },
    syncUniforms: (aspect, slot0, slot1) => {
      material.uniforms.uAspect.value = aspect;
      (material.uniforms.uCenter0.value as THREE.Vector2).copy(slot0.center);
      (material.uniforms.uParams0.value as THREE.Vector4).copy(slot0.params);
      (material.uniforms.uCenter1.value as THREE.Vector2).copy(slot1.center);
      (material.uniforms.uParams1.value as THREE.Vector4).copy(slot1.params);
    },
    dispose: () => {
      fbTexture.dispose();
      quadGeo.dispose();
      material.dispose();
    },
  };
}
