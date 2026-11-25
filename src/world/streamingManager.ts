import { REGION_LIST, type RegionId } from './worldConfig';

export type GraphicsPresetId =
  | 'mobile_low'
  | 'mobile_balanced'
  | 'mobile_high'
  | 'low'
  | 'medium'
  | 'high'
  | 'ultra';

export interface GraphicsPresetConfig {
  id: GraphicsPresetId;
  label: string;
  isMobilePreset: boolean;
  maxPixelRatio: number;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  postProcessingEnabled: boolean;
  fogDensityMultiplier: number;
  lodBias: number;
  particleScale: number;
  dynamicResolutionMin: number;
  memoryBudgetMB: number;
  aiUpdateIntervalMultiplier: number;
}

export const GRAPHICS_PRESETS: Record<GraphicsPresetId, GraphicsPresetConfig> = {
  mobile_low: {
    id: 'mobile_low',
    label: 'Mobile Low (Battery & 60 FPS)',
    isMobilePreset: true,
    maxPixelRatio: 0.9,
    shadowsEnabled: false,
    shadowMapSize: 512,
    postProcessingEnabled: false,
    fogDensityMultiplier: 1.25,
    lodBias: 0.65,
    particleScale: 0.35,
    dynamicResolutionMin: 0.55,
    memoryBudgetMB: 256,
    aiUpdateIntervalMultiplier: 1.8,
  },
  mobile_balanced: {
    id: 'mobile_balanced',
    label: 'Mobile Balanced',
    isMobilePreset: true,
    maxPixelRatio: 1.25,
    shadowsEnabled: false,
    shadowMapSize: 512,
    postProcessingEnabled: false,
    fogDensityMultiplier: 1.12,
    lodBias: 0.85,
    particleScale: 0.55,
    dynamicResolutionMin: 0.65,
    memoryBudgetMB: 384,
    aiUpdateIntervalMultiplier: 1.35,
  },
  mobile_high: {
    id: 'mobile_high',
    label: 'Mobile High (Tablet / Flagship)',
    isMobilePreset: true,
    maxPixelRatio: 1.5,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    postProcessingEnabled: false,
    fogDensityMultiplier: 1.0,
    lodBias: 1.05,
    particleScale: 0.78,
    dynamicResolutionMin: 0.75,
    memoryBudgetMB: 512,
    aiUpdateIntervalMultiplier: 1.1,
  },
  low: {
    id: 'low',
    label: 'Desktop Low',
    isMobilePreset: false,
    maxPixelRatio: 1.0,
    shadowsEnabled: false,
    shadowMapSize: 512,
    postProcessingEnabled: false,
    fogDensityMultiplier: 1.18,
    lodBias: 0.75,
    particleScale: 0.5,
    dynamicResolutionMin: 0.6,
    memoryBudgetMB: 512,
    aiUpdateIntervalMultiplier: 1.4,
  },
  medium: {
    id: 'medium',
    label: 'Desktop Medium',
    isMobilePreset: false,
    maxPixelRatio: 1.25,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    postProcessingEnabled: true,
    fogDensityMultiplier: 1.08,
    lodBias: 0.95,
    particleScale: 0.72,
    dynamicResolutionMin: 0.7,
    memoryBudgetMB: 768,
    aiUpdateIntervalMultiplier: 1.15,
  },
  high: {
    id: 'high',
    label: 'Desktop High',
    isMobilePreset: false,
    maxPixelRatio: 1.75,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    postProcessingEnabled: true,
    fogDensityMultiplier: 1.0,
    lodBias: 1.2,
    particleScale: 0.92,
    dynamicResolutionMin: 0.82,
    memoryBudgetMB: 1024,
    aiUpdateIntervalMultiplier: 1.0,
  },
  ultra: {
    id: 'ultra',
    label: 'Desktop Ultra (Cinematic)',
    isMobilePreset: false,
    maxPixelRatio: 2.0,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    postProcessingEnabled: true,
    fogDensityMultiplier: 0.94,
    lodBias: 1.45,
    particleScale: 1.15,
    dynamicResolutionMin: 0.9,
    memoryBudgetMB: 1536,
    aiUpdateIntervalMultiplier: 1.0,
  },
};

export interface PlayerControlSettings {
  cameraSensitivity: number; // 0.3 .. 2.5
  aimSensitivity: number; // 0.2 .. 2.0
  cameraDistance: number; // 2.6 .. 6.2
  invertY: boolean;
  adaptiveResolution: boolean;
  devWireframes: boolean;
}

export const DEFAULT_CONTROL_SETTINGS: PlayerControlSettings = {
  cameraSensitivity: 1.0,
  aimSensitivity: 0.55,
  cameraDistance: 3.85,
  invertY: false,
  adaptiveResolution: true,
  devWireframes: false,
};

export type RegionLodTier = 'high' | 'medium' | 'distant';

export interface RegionStreamState {
  regionId: RegionId;
  distanceToCamera: number;
  lodTier: RegionLodTier;
  detailVisible: boolean;
  microPropsVisible: boolean;
}

export interface StreamingReport {
  activeHighRegions: number;
  activeMediumRegions: number;
  activeDistantRegions: number;
  regions: Record<RegionId, RegionStreamState>;
}

/**
 * Pure distance-based region streaming & LOD tier evaluator.
 */
export function evaluateRegionStreaming(
  camX: number,
  camZ: number,
  lodBias = 1.0,
): StreamingReport {
  const highCutoff = 1450 * lodBias;
  const medCutoff = 3100 * lodBias;

  const regions = {} as Record<RegionId, RegionStreamState>;
  let activeHighRegions = 0;
  let activeMediumRegions = 0;
  let activeDistantRegions = 0;

  for (const r of REGION_LIST) {
    const dist = Math.hypot(camX - r.center[0], camZ - r.center[1]);
    let lodTier: RegionLodTier;
    if (dist <= highCutoff) {
      lodTier = 'high';
      activeHighRegions++;
    } else if (dist <= medCutoff) {
      lodTier = 'medium';
      activeMediumRegions++;
    } else {
      lodTier = 'distant';
      activeDistantRegions++;
    }

    regions[r.id] = {
      regionId: r.id,
      distanceToCamera: Math.round(dist),
      lodTier,
      detailVisible: lodTier !== 'distant',
      microPropsVisible: lodTier === 'high',
    };
  }

  return {
    activeHighRegions,
    activeMediumRegions,
    activeDistantRegions,
    regions,
  };
}

export interface RenderCapabilities {
  backendLabel: string;
  webGpuSupported: boolean;
  isSoftwareGl: boolean;
  gpuRenderer: string;
  gpuVendor: string;
}

export interface PerformanceSnapshot {
  avgFps: number;
  onePercentLowFps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  jsHeapMB: number | null;
  resolutionScale: number;
}

export function computeFpsStats(frameTimesMs: readonly number[]): {
  avgFps: number;
  onePercentLowFps: number;
} {
  if (frameTimesMs.length === 0) {
    return { avgFps: 60, onePercentLowFps: 60 };
  }
  let sum = 0;
  for (let i = 0; i < frameTimesMs.length; i++) sum += frameTimesMs[i];
  const avgMs = sum / frameTimesMs.length;

  const sorted = [...frameTimesMs].sort((a, b) => b - a);
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.05));
  let worstSum = 0;
  for (let i = 0; i < topCount; i++) worstSum += sorted[i];
  const worstMs = worstSum / topCount;

  return {
    avgFps: Math.max(1, Math.round(1000 / Math.max(1, avgMs))),
    onePercentLowFps: Math.max(1, Math.round(1000 / Math.max(1, worstMs))),
  };
}

export function detectRenderCapabilities(): RenderCapabilities {
  let gpuRenderer = 'Unknown GPU';
  let gpuVendor = 'Unknown Vendor';
  let isSoftwareGl = false;

  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      if (!gl) {
        isSoftwareGl = true;
        gpuRenderer = 'Fallback Context';
      } else {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const vParam = ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR;
        gpuRenderer = String(gl.getParameter(param));
        gpuVendor = String(gl.getParameter(vParam));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuRenderer);
      }
    } catch {
      isSoftwareGl = true;
    }
  }

  const webGpuSupported =
    typeof navigator !== 'undefined' && 'gpu' in navigator && !isSoftwareGl;

  return {
    backendLabel: webGpuSupported
      ? 'WebGPU Ready · WebGL 2 PBR'
      : isSoftwareGl
      ? 'WebGL 2 (Software Renderer)'
      : 'WebGL 2 Hardware PBR',
    webGpuSupported,
    isSoftwareGl,
    gpuRenderer,
    gpuVendor,
  };
}
