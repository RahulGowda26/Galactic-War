import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

export interface AssetPipelineStatus {
  gltfLoaderReady: boolean;
  dracoConfigured: boolean;
  ktx2Configured: boolean;
  loadedExternalAssets: string[];
  proceduralHeroFallbackActive: boolean;
}

/**
 * Production-ready GLTF / GLB / Draco / KTX2 asset streaming registry.
 * Supports mounting professionally authored external .glb / .ktx2 models at runtime
 * while guaranteeing zero-404 fallback to high-detail sculpted PBR hero modules when
 * no external model files are hosted in /public/models/.
 */
export class AssetPipeline {
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private ktx2Loader: KTX2Loader;
  private cache = new Map<string, THREE.Group>();
  private loadedUrls: string[] = [];

  constructor(renderer: THREE.WebGLRenderer) {
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/');
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    this.ktx2Loader = new KTX2Loader();
    this.ktx2Loader.setTranscoderPath('/basis/');
    this.ktx2Loader.detectSupport(renderer);
    this.gltfLoader.setKTX2Loader(this.ktx2Loader);
  }

  public async tryLoadGlb(url: string): Promise<THREE.Group | null> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!.clone(true);
    }
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (!head.ok) return null;
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        this.gltfLoader.load(url, resolve, undefined, reject);
      });
      this.cache.set(url, gltf.scene);
      this.loadedUrls.push(url);
      return gltf.scene.clone(true);
    } catch {
      return null;
    }
  }

  public getStatus(): AssetPipelineStatus {
    return {
      gltfLoaderReady: true,
      dracoConfigured: true,
      ktx2Configured: true,
      loadedExternalAssets: [...this.loadedUrls],
      proceduralHeroFallbackActive: this.loadedUrls.length === 0,
    };
  }

  public dispose(): void {
    this.dracoLoader.dispose();
    this.ktx2Loader.dispose();
    this.cache.clear();
  }
}
