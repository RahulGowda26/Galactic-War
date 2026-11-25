import * as THREE from 'three';

export interface ProceduralTexturePack {
  // Architectural Skyscraper Families (PBR Albedo + Tangent Normal + Roughness + Emissive)
  cityGlassAlbedo: THREE.CanvasTexture;
  cityGlassNormal: THREE.CanvasTexture;
  cityGlassRoughness: THREE.CanvasTexture;
  cityGlassEmissive: THREE.CanvasTexture;
  cityStoneAlbedo: THREE.CanvasTexture;
  cityStoneNormal: THREE.CanvasTexture;
  cityStoneRoughness: THREE.CanvasTexture;
  // Devastated Ruined Concrete (zero polka dots — realistic shattered slabs & soot)
  ruinFacadeAlbedo: THREE.CanvasTexture;
  ruinFacadeNormal: THREE.CanvasTexture;
  // Roads & Urban Sidewalks
  roadAlbedo: THREE.CanvasTexture;
  roadNormal: THREE.CanvasTexture;
  // Multi-Biome Planetary Terrain Maps
  terrainEarthAlbedo: THREE.CanvasTexture;
  terrainRockAlbedo: THREE.CanvasTexture;
  terrainNormal: THREE.CanvasTexture;
  // Alien Obsidian & Sovereign Weathered Biomech Armor
  obsidianAlbedo: THREE.CanvasTexture;
  obsidianNormal: THREE.CanvasTexture;
  sovereignArmorAlbedo: THREE.CanvasTexture;
  sovereignArmorNormal: THREE.CanvasTexture;
  sovereignArmorRoughness: THREE.CanvasTexture;
  sovereignCapeNormal: THREE.CanvasTexture;
  // Water & VFX Sprites
  waterNormal: THREE.CanvasTexture;
  smokeSprite: THREE.CanvasTexture;
  glowSprite: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  hologramSign: THREE.CanvasTexture;
  // Phase 4: Realistic Soldier Protagonist & Orbital Asteroid PBR Maps
  soldierFaceAlbedo: THREE.CanvasTexture;
  soldierFaceNormal: THREE.CanvasTexture;
  soldierFaceRoughness: THREE.CanvasTexture;
  soldierVestAlbedo: THREE.CanvasTexture;
  soldierVestNormal: THREE.CanvasTexture;
  soldierVestRoughness: THREE.CanvasTexture;
  soldierFabricAlbedo: THREE.CanvasTexture;
  soldierFabricNormal: THREE.CanvasTexture;
  asteroidRockAlbedo: THREE.CanvasTexture;
  asteroidRockNormal: THREE.CanvasTexture;
  asteroidRockRoughness: THREE.CanvasTexture;
  // AAA Space Redesign: Military Aerospace Hull & Heavy Warship Armor PBR Maps
  shipHullAlbedo: THREE.CanvasTexture;
  shipHullNormal: THREE.CanvasTexture;
  shipHullRoughness: THREE.CanvasTexture;
  enemyWarshipAlbedo: THREE.CanvasTexture;
  enemyWarshipNormal: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * Generates a real tangent-space Normal Map (RGB) from a grayscale height canvas using Sobel gradients.
 */
function buildNormalFromHeight(heightCanvas: HTMLCanvasElement, strength = 2.4): HTMLCanvasElement {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d')!;
  const src = srcCtx.getImageData(0, 0, w, h).data;

  const [outCanvas, outCtx] = makeCanvas(w, h);
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  const sample = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const dz = 1.0;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((-dx * invLen * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((-dy * invLen * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  return outCanvas;
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTexturePack {
  const all: THREE.Texture[] = [];
  const reg = (t: THREE.CanvasTexture) => {
    all.push(t);
    return t;
  };

  // =========================================================================
  // 1. REALISTIC CURTAIN-WALL GLASS SKYSCRAPER (Ref #2 & #10)
  // =========================================================================
  const [gAlb, cGAlb] = makeCanvas(512, 512);
  const [gHgt, cGHgt] = makeCanvas(512, 512);
  const [gRgh, cGRgh] = makeCanvas(512, 512);
  const [gEmi, cGEmi] = makeCanvas(512, 512);

  cGAlb.fillStyle = '#2a333f';
  cGAlb.fillRect(0, 0, 512, 512);
  cGHgt.fillStyle = '#c8c8c8';
  cGHgt.fillRect(0, 0, 512, 512);
  cGRgh.fillStyle = '#7a7a7a'; // mullions semi-rough metal
  cGRgh.fillRect(0, 0, 512, 512);
  cGEmi.fillStyle = '#000000';
  cGEmi.fillRect(0, 0, 512, 512);

  const gCols = 12;
  const gRows = 24;
  const gCw = 512 / gCols;
  const gRh = 512 / gRows;

  for (let r = 0; r < gRows; r++) {
    const isMech = r % 12 === 0;
    const y = r * gRh;
    for (let c = 0; c < gCols; c++) {
      const x = c * gCw;
      const h = hash2(c * 3.1 + 7, r * 5.7 + 11);

      if (isMech) {
        // Mechanical ventilation louvers
        cGAlb.fillStyle = '#1d232b';
        cGAlb.fillRect(x + 2, y + 2, gCw - 4, gRh - 4);
        cGHgt.fillStyle = '#505050';
        for (let lv = 3; lv < gRh - 3; lv += 3) {
          cGHgt.fillRect(x + 3, y + lv, gCw - 6, 1.5);
        }
        cGRgh.fillStyle = '#b8b8b8';
        cGRgh.fillRect(x + 2, y + 2, gCw - 4, gRh - 4);
      } else {
        // Recessed realistic reflective slate-blue architectural glass with interior depth
        const grad = cGAlb.createLinearGradient(x, y + 3, x, y + gRh - 3);
        const shade = Math.round(44 + h * 26);
        grad.addColorStop(0, `rgb(${shade + 12}, ${shade + 22}, ${shade + 32})`);
        grad.addColorStop(0.55, `rgb(${shade - 6}, ${shade + 2}, ${shade + 10})`);
        grad.addColorStop(1, `rgb(${shade - 14}, ${shade - 10}, ${shade - 4})`);
        cGAlb.fillStyle = grad;
        cGAlb.fillRect(x + 3, y + 3, gCw - 6, gRh - 6);

        // Recessed window depth in height map -> sharp beveled normal map!
        cGHgt.fillStyle = '#383838';
        cGHgt.fillRect(x + 3, y + 3, gCw - 6, gRh - 6);

        // Smooth reflective glass roughness (very low roughness = ~0.14)
        cGRgh.fillStyle = '#242424';
        cGRgh.fillRect(x + 3, y + 3, gCw - 6, gRh - 6);

        // Subtle realistic interior blinds / ceiling office strips (ONLY ~18% of offices lit!)
        if (h > 0.81) {
          const warm = h > 0.89;
          cGEmi.fillStyle = warm ? '#a67b4d' : '#6c8aa6';
          cGEmi.fillRect(x + 5, y + 5, gCw - 10, gRh * 0.45);
        }
      }
    }
    // Concrete/aluminum horizontal spandrel slab
    cGAlb.fillStyle = '#3d4652';
    cGAlb.fillRect(0, y, 512, 3);
    cGHgt.fillStyle = '#ececec';
    cGHgt.fillRect(0, y, 512, 3);
  }
  // Structural vertical pilasters every 3 bays
  for (let c = 0; c < gCols; c += 3) {
    cGAlb.fillStyle = '#48525e';
    cGAlb.fillRect(c * gCw, 0, 5, 512);
    cGHgt.fillStyle = '#ffffff';
    cGHgt.fillRect(c * gCw, 0, 5, 512);
  }

  const cityGlassAlbedo = reg(finalizeTexture(gAlb, true, 1, 2, maxAnisotropy));
  const cityGlassNormal = reg(finalizeTexture(buildNormalFromHeight(gHgt, 2.8), false, 1, 2, maxAnisotropy));
  const cityGlassRoughness = reg(finalizeTexture(gRgh, false, 1, 2, maxAnisotropy));
  const cityGlassEmissive = reg(finalizeTexture(gEmi, true, 1, 2, maxAnisotropy));

  // =========================================================================
  // 2. MONUMENTAL LIMESTONE & RECESSED WINDOW TOWER (Ref #10 Matrix Awakens feel)
  // =========================================================================
  const [sAlb, cSAlb] = makeCanvas(512, 512);
  const [sHgt, cSHgt] = makeCanvas(512, 512);
  const [sRgh, cSRgh] = makeCanvas(512, 512);

  cSAlb.fillStyle = '#8b8a84';
  cSAlb.fillRect(0, 0, 512, 512);
  cSHgt.fillStyle = '#d4d4d4';
  cSHgt.fillRect(0, 0, 512, 512);
  cSRgh.fillStyle = '#c8c8c8'; // matte stone
  cSRgh.fillRect(0, 0, 512, 512);

  // Subtle architectural stone block variation & weathering streaks
  for (let i = 0; i < 480; i++) {
    const x = hash2(i, 1.3) * 512;
    const y = hash2(i, 4.9) * 512;
    const v = 115 + Math.floor(hash2(i, 9.1) * 34);
    cSAlb.fillStyle = `rgba(${v},${v - 2},${v - 6},0.22)`;
    cSAlb.fillRect(x, y, 22, 10);
  }

  const sCols = 8;
  const sRows = 16;
  const sCw = 512 / sCols;
  const sRh = 512 / sRows;
  for (let r = 0; r < sRows; r++) {
    const y = r * sRh;
    // Carved stone cornice molding every 4 floors
    if (r % 4 === 0) {
      cSAlb.fillStyle = '#9c9b95';
      cSAlb.fillRect(0, y, 512, 6);
      cSHgt.fillStyle = '#ffffff';
      cSHgt.fillRect(0, y, 512, 6);
    }
    for (let c = 0; c < sCols; c++) {
      const x = c * sCw;
      const h = hash2(c * 4.3, r * 7.1);
      // Deeply recessed window bay
      cSAlb.fillStyle = '#20262e';
      cSAlb.fillRect(x + 10, y + 6, sCw - 20, sRh - 11);
      cSHgt.fillStyle = '#222222';
      cSHgt.fillRect(x + 10, y + 6, sCw - 20, sRh - 11);
      cSRgh.fillStyle = '#262626'; // glass pane reflective
      cSRgh.fillRect(x + 10, y + 6, sCw - 20, sRh - 11);

      // Window cross-mullion
      cSAlb.fillStyle = '#47494d';
      cSAlb.fillRect(x + sCw * 0.5 - 1, y + 6, 2, sRh - 11);
      cSHgt.fillStyle = '#888888';
      cSHgt.fillRect(x + sCw * 0.5 - 1, y + 6, 2, sRh - 11);

      // Subtle warm interior reflection on ~15% of windows
      if (h > 0.85) {
        cSAlb.fillStyle = 'rgba(218, 178, 122, 0.36)';
        cSAlb.fillRect(x + 12, y + 8, sCw - 24, sRh - 15);
      }

      // Vertical stone fluting pilaster
      cSAlb.fillStyle = '#75746e';
      cSAlb.fillRect(x + 2, y, 4, sRh);
      cSHgt.fillStyle = '#f2f2f2';
      cSHgt.fillRect(x + 2, y, 4, sRh);
    }
  }

  const cityStoneAlbedo = reg(finalizeTexture(sAlb, true, 1, 2, maxAnisotropy));
  const cityStoneNormal = reg(finalizeTexture(buildNormalFromHeight(sHgt, 3.2), false, 1, 2, maxAnisotropy));
  const cityStoneRoughness = reg(finalizeTexture(sRgh, false, 1, 2, maxAnisotropy));

  // =========================================================================
  // 3. REALISTIC DEVASTATED RUINED CONCRETE (Ref #3 — ZERO orange polka dots!)
  // =========================================================================
  const [rAlb, cRAlb] = makeCanvas(512, 512);
  const [rHgt, cRHgt] = makeCanvas(512, 512);

  cRAlb.fillStyle = '#53514e';
  cRAlb.fillRect(0, 0, 512, 512);
  cRHgt.fillStyle = '#b4b4b4';
  cRHgt.fillRect(0, 0, 512, 512);

  // Heavy concrete grime, scorch streaks & blast pitting
  for (let i = 0; i < 140; i++) {
    const gx = hash2(i, 2.7) * 512;
    const gy = hash2(i, 8.3) * 512;
    const rad = 16 + (i % 5) * 16;
    const gr = cRAlb.createRadialGradient(gx, gy, 2, gx, gy, rad);
    gr.addColorStop(0, i % 3 === 0 ? 'rgba(22,20,20,0.62)' : 'rgba(98,94,88,0.34)');
    gr.addColorStop(1, 'rgba(40,38,36,0)');
    cRAlb.fillStyle = gr;
    cRAlb.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
  }

  for (let r = 0; r < 14; r++) {
    const rowY = r * (512 / 14);
    // Exposed concrete floor slab edge
    cRAlb.fillStyle = '#6c6862';
    cRAlb.fillRect(0, rowY, 512, 5);
    cRHgt.fillStyle = '#f0f0f0';
    cRHgt.fillRect(0, rowY, 512, 5);

    for (let c = 0; c < 8; c++) {
      const colX = c * (512 / 8);
      const h = hash2(r * 11.3, c * 17.7);
      // Hollow pitch-dark shattered window openings
      cRAlb.fillStyle = h > 0.6 ? '#121316' : '#1d1e21';
      cRAlb.fillRect(colX + 6, rowY + 7, 52, h > 0.7 ? 27 : 22);
      cRHgt.fillStyle = '#181818';
      cRHgt.fillRect(colX + 6, rowY + 7, 52, 24);

      // Rising soot streaks above burned floors
      if (h > 0.55) {
        const sg = cRAlb.createLinearGradient(0, rowY + 8, 0, rowY - 38);
        sg.addColorStop(0, 'rgba(14,14,16,0.72)');
        sg.addColorStop(1, 'rgba(14,14,16,0)');
        cRAlb.fillStyle = sg;
        cRAlb.fillRect(colX + 2, rowY - 38, 60, 46);
      }
    }
  }
  const ruinFacadeAlbedo = reg(finalizeTexture(rAlb, true, 1, 2, maxAnisotropy));
  const ruinFacadeNormal = reg(finalizeTexture(buildNormalFromHeight(rHgt, 3.0), false, 1, 2, maxAnisotropy));

  // =========================================================================
  // 4. REALISTIC MULTI-LANE URBAN ASPHALT & SIDEWALK CURBS
  // =========================================================================
  const [rdAlb, cRdAlb] = makeCanvas(512, 512);
  const [rdHgt, cRdHgt] = makeCanvas(512, 512);
  cRdAlb.fillStyle = '#33363b';
  cRdAlb.fillRect(0, 0, 512, 512);
  cRdHgt.fillStyle = '#707070';
  cRdHgt.fillRect(0, 0, 512, 512);

  // Asphalt aggregate grain + tire wear tracks
  for (let i = 0; i < 6500; i++) {
    const gx = hash2(i, 1.1) * 512;
    const gy = hash2(i, 3.7) * 512;
    const v = 42 + Math.floor(hash2(i, 7.9) * 28);
    cRdAlb.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
    cRdAlb.fillRect(gx, gy, 2.5, 2.5);
    cRdHgt.fillStyle = `rgb(${v * 2},${v * 2},${v * 2})`;
    cRdHgt.fillRect(gx, gy, 2.5, 2.5);
  }
  // Darker tire wear tracks in lanes
  cRdAlb.fillStyle = 'rgba(20,22,25,0.28)';
  cRdAlb.fillRect(92, 0, 42, 512);
  cRdAlb.fillRect(172, 0, 42, 512);
  cRdAlb.fillRect(298, 0, 42, 512);
  cRdAlb.fillRect(378, 0, 42, 512);

  // Concrete sidewalks/curbs along edges
  cRdAlb.fillStyle = '#6c6d6b';
  cRdAlb.fillRect(0, 0, 38, 512);
  cRdAlb.fillRect(474, 0, 38, 512);
  cRdHgt.fillStyle = '#e0e0e0';
  cRdHgt.fillRect(0, 0, 38, 512);
  cRdHgt.fillRect(474, 0, 38, 512);

  // Double yellow/amber weathered median + white dashed lane dividers
  cRdAlb.fillStyle = '#b9934c';
  cRdAlb.fillRect(249, 0, 5, 512);
  cRdAlb.fillRect(258, 0, 5, 512);
  cRdAlb.fillStyle = '#c4c7cc';
  for (let y = 18; y < 512; y += 64) {
    cRdAlb.fillRect(142, y, 5, 30);
    cRdAlb.fillRect(365, y, 5, 30);
  }
  const roadAlbedo = reg(finalizeTexture(rdAlb, true, 1, 10, maxAnisotropy));
  const roadNormal = reg(finalizeTexture(buildNormalFromHeight(rdHgt, 1.8), false, 1, 10, maxAnisotropy));

  // =========================================================================
  // 5. MULTI-BIOME PLANETARY TERRAIN TEXTURES (Earth/Scrub + Basalt Cliff Rock)
  // =========================================================================
  const [teC, cTe] = makeCanvas(512, 512);
  const [trC, cTr] = makeCanvas(512, 512);
  const [tnH, cTnH] = makeCanvas(512, 512);

  cTe.fillStyle = '#665e4c';
  cTe.fillRect(0, 0, 512, 512);
  cTr.fillStyle = '#4f5258';
  cTr.fillRect(0, 0, 512, 512);
  cTnH.fillStyle = '#808080';
  cTnH.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 2400; i++) {
    const x = hash2(i, 1.9) * 512;
    const y = hash2(i, 5.3) * 512;
    const sz = 4 + hash2(i, 8.1) * 20;
    const h = hash2(i, 12.7);
    // Battlefield soil, dry grass patches & stones
    if (h > 0.62) {
      cTe.fillStyle = `rgba(74, 82, 56, 0.32)`;
    } else if (h > 0.3) {
      cTe.fillStyle = `rgba(92, 82, 64, 0.34)`;
    } else {
      cTe.fillStyle = `rgba(54, 48, 42, 0.36)`;
    }
    cTe.fillRect(x, y, sz, sz * 0.85);

    // Stratified cliff basalt rock
    const rv = 56 + Math.floor(h * 52);
    cTr.fillStyle = `rgba(${rv}, ${rv + 2}, ${rv + 6}, 0.42)`;
    cTr.fillRect(x, y, sz * 1.9, sz * 0.45);

    const hv = Math.floor(40 + h * 185);
    cTnH.fillStyle = `rgba(${hv},${hv},${hv},0.48)`;
    cTnH.fillRect(x, y, sz * 1.4, sz * 0.6);
  }
  const terrainEarthAlbedo = reg(finalizeTexture(teC, true, 1, 1, maxAnisotropy));
  const terrainRockAlbedo = reg(finalizeTexture(trC, true, 1, 1, maxAnisotropy));
  const terrainNormal = reg(finalizeTexture(buildNormalFromHeight(tnH, 2.5), false, 96, 96, maxAnisotropy));

  // =========================================================================
  // 6. ALIEN OBSIDIAN & SOVEREIGN WEATHERED CARAPACE PBR MAPS
  // =========================================================================
  const [obC, cOb] = makeCanvas(512, 512);
  const [obH, cObH] = makeCanvas(512, 512);
  cOb.fillStyle = '#181b21';
  cOb.fillRect(0, 0, 512, 512);
  cObH.fillStyle = '#606060';
  cObH.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 28) {
    cOb.strokeStyle = '#2d333f';
    cOb.lineWidth = 3;
    cObH.strokeStyle = '#e4e4e4';
    cObH.lineWidth = 5;
    cOb.beginPath();
    cOb.moveTo(0, y);
    cOb.lineTo(150, y + 14);
    cOb.lineTo(362, y + 14);
    cOb.lineTo(512, y);
    cOb.stroke();
    cObH.beginPath();
    cObH.moveTo(0, y);
    cObH.lineTo(150, y + 14);
    cObH.lineTo(362, y + 14);
    cObH.lineTo(512, y);
    cObH.stroke();
  }
  // Micro scratches & metallic surface imperfections
  for (let i = 0; i < 650; i++) {
    const x = hash2(i, 2.1) * 512;
    const y = hash2(i, 6.4) * 512;
    cOb.fillStyle = 'rgba(130, 145, 165, 0.08)';
    cOb.fillRect(x, y, 16, 1.5);
  }
  const obsidianAlbedo = reg(finalizeTexture(obC, true, 2, 4, maxAnisotropy));
  const obsidianNormal = reg(finalizeTexture(buildNormalFromHeight(obH, 3.0), false, 2, 4, maxAnisotropy));

  // Sovereign intricate sculpted armor albedo + normal + roughness (Ref #11)
  const [saAlb, cSaAlb] = makeCanvas(512, 512);
  const [saHgt, cSaHgt] = makeCanvas(512, 512);
  const [saRgh, cSaRgh] = makeCanvas(512, 512);
  cSaAlb.fillStyle = '#232730';
  cSaAlb.fillRect(0, 0, 512, 512);
  cSaHgt.fillStyle = '#555555';
  cSaHgt.fillRect(0, 0, 512, 512);
  cSaRgh.fillStyle = '#484848';
  cSaRgh.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 20; i++) {
    const y = 20 + i * 25;
    cSaAlb.strokeStyle = i % 2 === 0 ? '#363c48' : '#1b1f27';
    cSaAlb.lineWidth = 8;
    cSaAlb.beginPath();
    cSaAlb.moveTo(12, y - 16);
    cSaAlb.quadraticCurveTo(256, y + 24, 500, y - 16);
    cSaAlb.stroke();

    cSaHgt.strokeStyle = '#efefef';
    cSaHgt.lineWidth = 7;
    cSaHgt.beginPath();
    cSaHgt.moveTo(12, y - 16);
    cSaHgt.quadraticCurveTo(256, y + 24, 500, y - 16);
    cSaHgt.stroke();

    // Worn polished ridge highlight in roughness map
    cSaRgh.strokeStyle = '#222222';
    cSaRgh.lineWidth = 4;
    cSaRgh.beginPath();
    cSaRgh.moveTo(12, y - 16);
    cSaRgh.quadraticCurveTo(256, y + 24, 500, y - 16);
    cSaRgh.stroke();
  }
  const sovereignArmorAlbedo = reg(finalizeTexture(saAlb, true, 1, 1, maxAnisotropy));
  const sovereignArmorNormal = reg(finalizeTexture(buildNormalFromHeight(saHgt, 3.2), false, 1, 1, maxAnisotropy));
  const sovereignArmorRoughness = reg(finalizeTexture(saRgh, false, 1, 1, maxAnisotropy));

  // Woven heavy cloak normal map
  const [scH, cScH] = makeCanvas(256, 256);
  cScH.fillStyle = '#808080';
  cScH.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 4) {
    const v = Math.round(Math.sin((x / 256) * Math.PI * 16) * 42 + 128);
    cScH.fillStyle = `rgb(${v},${v},${v})`;
    cScH.fillRect(x, 0, 4, 256);
  }
  for (let y = 0; y < 256; y += 3) {
    cScH.fillStyle = 'rgba(255,255,255,0.08)';
    cScH.fillRect(0, y, 256, 1);
  }
  const sovereignCapeNormal = reg(finalizeTexture(buildNormalFromHeight(scH, 1.8), false, 2, 2, maxAnisotropy));

  // Animated water normal map
  const [wH, cWH] = makeCanvas(256, 256);
  for (let y = 0; y < 256; y += 2) {
    for (let x = 0; x < 256; x += 2) {
      const wave =
        Math.sin(x * 0.14 + Math.cos(y * 0.09) * 2.2) * 0.5 +
        Math.cos(y * 0.18 - Math.sin(x * 0.12) * 1.8) * 0.5;
      const v = Math.max(0, Math.min(255, Math.round(128 + wave * 64)));
      cWH.fillStyle = `rgb(${v},${v},${v})`;
      cWH.fillRect(x, y, 2, 2);
    }
  }
  const waterNormal = reg(finalizeTexture(buildNormalFromHeight(wH, 1.6), false, 36, 20, maxAnisotropy));

  // =========================================================================
  // 7. SOFT VOLUMETRIC SMOKE, GLOW, CONTACT SHADOW & HOLOGRAM SIGN
  // =========================================================================
  const [smC, cSm] = makeCanvas(128, 128);
  const smG = cSm.createRadialGradient(64, 64, 8, 64, 64, 62);
  smG.addColorStop(0, 'rgba(255,255,255,0.88)');
  smG.addColorStop(0.45, 'rgba(220,224,230,0.48)');
  smG.addColorStop(0.78, 'rgba(180,186,194,0.14)');
  smG.addColorStop(1, 'rgba(140,145,155,0.0)');
  cSm.fillStyle = smG;
  cSm.fillRect(0, 0, 128, 128);
  const smokeSprite = reg(finalizeTexture(smC, true, 1, 1, 1));
  smokeSprite.wrapS = THREE.ClampToEdgeWrapping;
  smokeSprite.wrapT = THREE.ClampToEdgeWrapping;

  const [glC, cGl] = makeCanvas(128, 128);
  const glG = cGl.createRadialGradient(64, 64, 2, 64, 64, 62);
  glG.addColorStop(0, 'rgba(255,252,240,1.0)');
  glG.addColorStop(0.28, 'rgba(255,184,96,0.72)');
  glG.addColorStop(0.62, 'rgba(255,98,28,0.22)');
  glG.addColorStop(1, 'rgba(255,48,10,0.0)');
  cGl.fillStyle = glG;
  cGl.fillRect(0, 0, 128, 128);
  const glowSprite = reg(finalizeTexture(glC, true, 1, 1, 1));
  glowSprite.wrapS = THREE.ClampToEdgeWrapping;
  glowSprite.wrapT = THREE.ClampToEdgeWrapping;

  const [csC, cCs] = makeCanvas(128, 128);
  const csG = cCs.createRadialGradient(64, 64, 6, 64, 64, 62);
  csG.addColorStop(0, 'rgba(0,0,0,0.76)');
  csG.addColorStop(0.55, 'rgba(0,0,0,0.34)');
  csG.addColorStop(1, 'rgba(0,0,0,0.0)');
  cCs.fillStyle = csG;
  cCs.fillRect(0, 0, 128, 128);
  const contactShadow = reg(finalizeTexture(csC, true, 1, 1, 1));
  contactShadow.wrapS = THREE.ClampToEdgeWrapping;
  contactShadow.wrapT = THREE.ClampToEdgeWrapping;

  const [hoC, cHo] = makeCanvas(512, 256);
  cHo.fillStyle = 'rgba(12, 24, 38, 0.78)';
  cHo.fillRect(0, 0, 512, 256);
  cHo.strokeStyle = '#6ec8f0';
  cHo.lineWidth = 4;
  cHo.strokeRect(10, 10, 492, 236);
  cHo.fillStyle = '#8ad8ff';
  cHo.font = 'bold 42px sans-serif';
  cHo.fillText('AETHER PRIME DEFENSE', 28, 86);
  cHo.fillStyle = '#d9dee6';
  cHo.font = '600 24px sans-serif';
  cHo.fillText('SECTOR A — CIVILIAN EVACUATION ACTIVE', 28, 146);
  cHo.fillStyle = '#f0a658';
  cHo.font = 'bold 22px sans-serif';
  cHo.fillText('TRANSIT CORRIDOR NORTH · KEEP CLEAR', 28, 198);
  cHo.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < 256; y += 6) cHo.fillRect(0, y, 512, 2);
  const hologramSign = reg(finalizeTexture(hoC, true, 1, 1, maxAnisotropy));
  hologramSign.wrapS = THREE.ClampToEdgeWrapping;
  hologramSign.wrapT = THREE.ClampToEdgeWrapping;

  // =========================================================================
  // 8. PHASE 4: REALISTIC ADULT MALE SOLDIER FACE PBR (Ref #1: Scarred, Stubble)
  // Centered at u = 0.5 (x = 256) matching SphereGeometry phiStart = -PI/2
  // =========================================================================
  const [sfAlb, cSfAlb] = makeCanvas(512, 512);
  const [sfHgt, cSfHgt] = makeCanvas(512, 512);
  const [sfRgh, cSfRgh] = makeCanvas(512, 512);

  // Base warm weathered adult skin tone with natural subsurface gradient
  const skinGrad = cSfAlb.createRadialGradient(256, 252, 24, 256, 260, 220);
  skinGrad.addColorStop(0, '#c29274');
  skinGrad.addColorStop(0.45, '#ae7e61');
  skinGrad.addColorStop(0.85, '#92654c');
  skinGrad.addColorStop(1, '#7c5440');
  cSfAlb.fillStyle = skinGrad;
  cSfAlb.fillRect(0, 0, 512, 512);

  cSfHgt.fillStyle = '#808080';
  cSfHgt.fillRect(0, 0, 512, 512);
  // Natural skin roughness (0.58 matte-satin, slightly smoother on nose/forehead/cheekbones)
  cSfRgh.fillStyle = '#a2a2a2';
  cSfRgh.fillRect(0, 0, 512, 512);

  // Micro skin pores, weathered tan mottling & battle dirt
  for (let i = 0; i < 4200; i++) {
    const px = hash2(i, 1.7) * 512;
    const py = hash2(i, 4.3) * 512;
    const h = hash2(i, 9.5);
    cSfAlb.fillStyle = h > 0.5 ? 'rgba(90, 56, 42, 0.08)' : 'rgba(220, 178, 150, 0.06)';
    cSfAlb.fillRect(px, py, 2.2, 2.2);
    const hv = Math.round(118 + h * 22);
    cSfHgt.fillStyle = `rgb(${hv},${hv},${hv})`;
    cSfHgt.fillRect(px, py, 2, 2);
  }

  // Dark hair hairline covering top crown, temples, and back of head (u < 0.27 or u > 0.73 or y < 145)
  cSfAlb.fillStyle = '#1b1715';
  cSfAlb.fillRect(0, 0, 512, 134);
  cSfAlb.fillRect(0, 128, 132, 248);
  cSfAlb.fillRect(380, 128, 132, 248);
  // Soft tapered temple sideburns & hairline
  const hairFadeTop = cSfAlb.createLinearGradient(0, 124, 0, 172);
  hairFadeTop.addColorStop(0, '#1b1715');
  hairFadeTop.addColorStop(0.55, 'rgba(30, 24, 21, 0.72)');
  hairFadeTop.addColorStop(1, 'rgba(30, 24, 21, 0)');
  cSfAlb.fillStyle = hairFadeTop;
  cSfAlb.fillRect(132, 124, 248, 48);

  // Subtle forehead brow tension creases & cheekbone shading
  cSfAlb.strokeStyle = 'rgba(84, 52, 38, 0.34)';
  cSfAlb.lineWidth = 2;
  cSfHgt.strokeStyle = '#555555';
  cSfHgt.lineWidth = 2;
  for (let row = 0; row < 2; row++) {
    cSfAlb.beginPath();
    cSfAlb.moveTo(212, 184 + row * 12);
    cSfAlb.quadraticCurveTo(256, 178 + row * 12, 300, 184 + row * 12);
    cSfAlb.stroke();
    cSfHgt.beginPath();
    cSfHgt.moveTo(212, 184 + row * 12);
    cSfHgt.quadraticCurveTo(256, 178 + row * 12, 300, 184 + row * 12);
    cSfHgt.stroke();
  }

  // Deep realistic orbital shading beneath furrowed adult male brow ridge
  for (const side of [-1, 1]) {
    const ex = 256 + side * 34;
    const ey = 242;
    const orbG = cSfAlb.createRadialGradient(ex, ey - 2, 5, ex, ey, 28);
    orbG.addColorStop(0, 'rgba(78, 48, 36, 0.44)');
    orbG.addColorStop(0.7, 'rgba(98, 64, 48, 0.20)');
    orbG.addColorStop(1, 'rgba(98, 64, 48, 0)');
    cSfAlb.fillStyle = orbG;
    cSfAlb.fillRect(ex - 30, ey - 24, 60, 46);

    // Stern straight adult male dark eyebrows (slightly furrowed toward nose bridge)
    cSfAlb.strokeStyle = '#201813';
    cSfAlb.lineWidth = 7.4;
    cSfAlb.lineCap = 'round';
    cSfAlb.beginPath();
    cSfAlb.moveTo(256 + side * 11, 224);
    cSfAlb.lineTo(ex, 219);
    cSfAlb.lineTo(256 + side * 55, 222);
    cSfAlb.stroke();
    cSfHgt.strokeStyle = '#d4d4d4';
    cSfHgt.lineWidth = 7;
    cSfHgt.beginPath();
    cSfHgt.moveTo(256 + side * 11, 224);
    cSfHgt.lineTo(ex, 219);
    cSfHgt.lineTo(256 + side * 55, 222);
    cSfHgt.stroke();

    // Subtle shaded socket backing behind 3D eyeballs (no stylized outer wing line)
    cSfAlb.fillStyle = '#d8cec5';
    cSfAlb.beginPath();
    cSfAlb.ellipse(ex, ey, 9.5, 4.2, 0, 0, Math.PI * 2);
    cSfAlb.fill();
    cSfAlb.fillStyle = '#473322';
    cSfAlb.beginPath();
    cSfAlb.arc(ex, ey, 4.4, 0, Math.PI * 2);
    cSfAlb.fill();
    cSfAlb.fillStyle = '#110e0c';
    cSfAlb.beginPath();
    cSfAlb.arc(ex, ey, 2.2, 0, Math.PI * 2);
    cSfAlb.fill();

    // Natural horizontal upper eyelid crease
    cSfAlb.strokeStyle = 'rgba(58, 38, 28, 0.68)';
    cSfAlb.lineWidth = 1.8;
    cSfAlb.beginPath();
    cSfAlb.moveTo(ex - 9.5, ey - 4.2);
    cSfAlb.quadraticCurveTo(ex, ey - 6.2, ex + 9.5, ey - 4.2);
    cSfAlb.stroke();
  }

  // Nose bridge highlight + weathered cheek-hollow contouring + nostrils
  const noseG = cSfAlb.createLinearGradient(244, 234, 268, 234);
  noseG.addColorStop(0, 'rgba(92, 58, 42, 0.30)');
  noseG.addColorStop(0.5, 'rgba(232, 194, 165, 0.24)');
  noseG.addColorStop(1, 'rgba(92, 58, 42, 0.30)');
  cSfAlb.fillStyle = noseG;
  cSfAlb.fillRect(244, 234, 24, 48);
  cSfAlb.fillStyle = 'rgba(64, 38, 28, 0.62)';
  cSfAlb.beginPath();
  cSfAlb.ellipse(249, 284, 4.0, 2.4, -0.2, 0, Math.PI * 2);
  cSfAlb.ellipse(263, 284, 4.0, 2.4, 0.2, 0, Math.PI * 2);
  cSfAlb.fill();

  // Natural feathered 5-o'clock beard shadow & fine jawline stubble (zero harsh oval cutoff!)
  const beardBase = cSfAlb.createRadialGradient(256, 342, 22, 256, 336, 98);
  beardBase.addColorStop(0, 'rgba(42, 33, 28, 0.32)');
  beardBase.addColorStop(0.68, 'rgba(54, 42, 36, 0.20)');
  beardBase.addColorStop(1, 'rgba(54, 42, 36, 0)');
  cSfAlb.fillStyle = beardBase;
  cSfAlb.fillRect(156, 276, 200, 130);

  for (let i = 0; i < 4200; i++) {
    const sx = 162 + hash2(i, 2.9) * 188;
    const sy = 286 + hash2(i, 6.7) * 108;
    const dx = (sx - 256) / 86;
    const dy = (sy - 338) / 56;
    const r2 = dx * dx + dy * dy;
    // Soft probabilistic feathering along jaw & cheeks
    if (r2 < 1.0 && hash2(i, 19.3) > r2 * 0.82) {
      if (Math.abs(sx - 256) < 21 && sy > 304 && sy < 322) continue;
      const alpha = (1 - r2 * 0.65) * (hash2(i, 11.1) > 0.35 ? 0.30 : 0.18);
      cSfAlb.fillStyle = `rgba(34, 28, 24, ${alpha.toFixed(2)})`;
      cSfAlb.fillRect(sx, sy, 1.4, 1.8);
      cSfHgt.fillStyle = '#969696';
      cSfHgt.fillRect(sx, sy, 1.3, 1.3);
    }
  }

  // Firm weathered lips & mouth crease
  cSfAlb.fillStyle = '#8d5a4e';
  cSfAlb.beginPath();
  cSfAlb.ellipse(256, 312, 21, 5.2, 0, 0, Math.PI * 2);
  cSfAlb.fill();
  cSfAlb.strokeStyle = '#47261f';
  cSfAlb.lineWidth = 2.2;
  cSfAlb.beginPath();
  cSfAlb.moveTo(234, 312);
  cSfAlb.quadraticCurveTo(256, 314.2, 278, 312);
  cSfAlb.stroke();

  // Natural weathered battle scars (healed pale-crimson scar tissue across left brow & cheekbone — realistic, not painted-on)
  const drawScar = (x1: number, y1: number, x2: number, y2: number, w: number) => {
    cSfAlb.strokeStyle = 'rgba(112, 46, 42, 0.62)';
    cSfAlb.lineWidth = w;
    cSfAlb.lineCap = 'round';
    cSfAlb.beginPath();
    cSfAlb.moveTo(x1, y1);
    cSfAlb.lineTo(x2, y2);
    cSfAlb.stroke();
    cSfAlb.strokeStyle = 'rgba(204, 166, 146, 0.68)';
    cSfAlb.lineWidth = w * 0.48;
    cSfAlb.beginPath();
    cSfAlb.moveTo(x1 + 1.2, y1 + 0.8);
    cSfAlb.lineTo(x2 + 1.2, y2 + 0.8);
    cSfAlb.stroke();
    cSfHgt.strokeStyle = '#383838';
    cSfHgt.lineWidth = w * 1.05;
    cSfHgt.beginPath();
    cSfHgt.moveTo(x1, y1);
    cSfHgt.lineTo(x2, y2);
    cSfHgt.stroke();
  };
  drawScar(288, 186, 272, 224, 3.2); // weathered diagonal left brow scar
  drawScar(306, 260, 286, 288, 2.8); // healed cheekbone crease scar

  const soldierFaceAlbedo = reg(finalizeTexture(sfAlb, true, 1, 1, maxAnisotropy));
  soldierFaceAlbedo.wrapS = THREE.ClampToEdgeWrapping;
  soldierFaceAlbedo.wrapT = THREE.ClampToEdgeWrapping;
  const soldierFaceNormal = reg(finalizeTexture(buildNormalFromHeight(sfHgt, 2.2), false, 1, 1, maxAnisotropy));
  const soldierFaceRoughness = reg(finalizeTexture(sfRgh, false, 1, 1, maxAnisotropy));

  // =========================================================================
  // 9. PHASE 5: KAEL VOSS DARK GRAPHITE SPECIAL-OPS COMPOSITE CHEST ARMOR PBR
  // =========================================================================
  const [svAlb, cSvAlb] = makeCanvas(512, 512);
  const [svHgt, cSvHgt] = makeCanvas(512, 512);
  const [svRgh, cSvRgh] = makeCanvas(512, 512);

  // Dark weathered graphite-titanium base (signature special-ops look, zero generic olive)
  cSvAlb.fillStyle = '#252a32';
  cSvAlb.fillRect(0, 0, 512, 512);
  cSvHgt.fillStyle = '#888888';
  cSvHgt.fillRect(0, 0, 512, 512);
  cSvRgh.fillStyle = '#7c7c7c';
  cSvRgh.fillRect(0, 0, 512, 512);

  // Layered micro-brushed composite weave & battlefield carbon grit
  for (let i = 0; i < 3400; i++) {
    const x = hash2(i, 3.1) * 512;
    const y = hash2(i, 7.2) * 512;
    const h = hash2(i, 13.4);
    cSvAlb.fillStyle = h > 0.5 ? 'rgba(72, 82, 96, 0.14)' : 'rgba(14, 17, 22, 0.22)';
    cSvAlb.fillRect(x, y, 5, 2.2);
  }

  // Angled composite ceramic trauma plate contours
  cSvAlb.fillStyle = '#2d333d';
  cSvAlb.beginPath();
  cSvAlb.moveTo(46, 26);
  cSvAlb.lineTo(466, 26);
  cSvAlb.lineTo(486, 118);
  cSvAlb.lineTo(442, 236);
  cSvAlb.lineTo(70, 236);
  cSvAlb.lineTo(26, 118);
  cSvAlb.closePath();
  cSvAlb.fill();
  cSvAlb.strokeStyle = '#151920';
  cSvAlb.lineWidth = 8;
  cSvAlb.stroke();
  cSvHgt.strokeStyle = '#ececec';
  cSvHgt.lineWidth = 9;
  cSvHgt.strokeRect(36, 32, 440, 202);

  // Subtle weathered tactical accent stripe (muted rust-amber special-ops trim, never bright neon)
  cSvAlb.fillStyle = '#8a4f2d';
  cSvAlb.fillRect(54, 48, 128, 12);
  cSvAlb.fillStyle = '#b4bcca';
  cSvAlb.font = 'bold 26px sans-serif';
  cSvAlb.fillText('K. VOSS // 07', 54, 102);

  // Vanguard-07 tactical nameplate & broken-chevron unit insignia
  cSvAlb.fillStyle = '#1b2027';
  cSvAlb.fillRect(54, 122, 256, 72);
  cSvAlb.strokeStyle = '#475262';
  cSvAlb.lineWidth = 3;
  cSvAlb.strokeRect(54, 122, 256, 72);
  cSvAlb.fillStyle = '#cfd6e0';
  cSvAlb.font = 'bold 42px sans-serif';
  cSvAlb.fillText('VANGUARD', 68, 172);
  cSvHgt.fillStyle = '#ffffff';
  cSvHgt.font = 'bold 42px sans-serif';
  cSvHgt.fillText('VANGUARD', 68, 172);

  // Vanguard-7 asymmetric shield-blade insignia
  cSvAlb.strokeStyle = '#c8874e';
  cSvAlb.lineWidth = 5;
  cSvAlb.beginPath();
  cSvAlb.moveTo(392, 74);
  cSvAlb.lineTo(432, 110);
  cSvAlb.lineTo(418, 184);
  cSvAlb.lineTo(392, 204);
  cSvAlb.lineTo(366, 184);
  cSvAlb.lineTo(352, 110);
  cSvAlb.closePath();
  cSvAlb.stroke();
  cSvAlb.beginPath();
  cSvAlb.moveTo(392, 92);
  cSvAlb.lineTo(392, 184);
  cSvAlb.stroke();

  // Articulated abdominal armor segments & tactical MOLLE harness straps
  for (let row = 0; row < 4; row++) {
    const y = 264 + row * 56;
    cSvAlb.fillStyle = '#1c2128';
    cSvAlb.fillRect(34, y, 444, 34);
    cSvHgt.fillStyle = '#dcdcdc';
    cSvHgt.fillRect(34, y, 444, 34);
    for (let col = 0; col < 7; col++) {
      cSvAlb.fillStyle = '#101419';
      cSvAlb.fillRect(58 + col * 62, y, 5, 34);
      cSvHgt.fillStyle = '#3c3c3c';
      cSvHgt.fillRect(58 + col * 62, y, 5, 34);
    }
  }

  // Realistic combat scratches, chipped gunmetal edges & carbon blast marks
  for (let i = 0; i < 32; i++) {
    const sx = 36 + hash2(i, 4.1) * 432;
    const sy = 32 + hash2(i, 8.9) * 432;
    const len = 16 + hash2(i, 2.3) * 52;
    const ang = -0.62 + (hash2(i, 5.5) - 0.5) * 0.45;
    cSvAlb.strokeStyle = i % 2 === 0 ? 'rgba(176, 188, 204, 0.55)' : 'rgba(14, 16, 20, 0.72)';
    cSvAlb.lineWidth = 2.4;
    cSvAlb.beginPath();
    cSvAlb.moveTo(sx, sy);
    cSvAlb.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    cSvAlb.stroke();
    cSvRgh.strokeStyle = '#282828'; // bare bright brushed steel scratch
    cSvRgh.lineWidth = 2.6;
    cSvRgh.beginPath();
    cSvRgh.moveTo(sx, sy);
    cSvRgh.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    cSvRgh.stroke();
  }

  const soldierVestAlbedo = reg(finalizeTexture(svAlb, true, 1, 1, maxAnisotropy));
  soldierVestAlbedo.wrapS = THREE.ClampToEdgeWrapping;
  soldierVestAlbedo.wrapT = THREE.ClampToEdgeWrapping;
  const soldierVestNormal = reg(finalizeTexture(buildNormalFromHeight(svHgt, 2.6), false, 1, 1, maxAnisotropy));
  const soldierVestRoughness = reg(finalizeTexture(svRgh, false, 1, 1, maxAnisotropy));

  // =========================================================================
  // 10. DARK BALLISTIC RIPSTOP FABRIC PBR (Sleeves & Combat Trousers)
  // =========================================================================
  const [fbAlb, cFbAlb] = makeCanvas(256, 256);
  const [fbHgt, cFbHgt] = makeCanvas(256, 256);
  cFbAlb.fillStyle = '#23272b';
  cFbAlb.fillRect(0, 0, 256, 256);
  cFbHgt.fillStyle = '#808080';
  cFbHgt.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6) {
    cFbAlb.fillStyle = 'rgba(255,255,255,0.035)';
    cFbAlb.fillRect(0, y, 256, 1.5);
    cFbHgt.fillStyle = '#9e9e9e';
    cFbHgt.fillRect(0, y, 256, 1.5);
  }
  for (let x = 0; x < 256; x += 6) {
    cFbAlb.fillStyle = 'rgba(0,0,0,0.12)';
    cFbAlb.fillRect(x, 0, 1.5, 256);
    cFbHgt.fillStyle = '#686868';
    cFbHgt.fillRect(x, 0, 1.5, 256);
  }
  const soldierFabricAlbedo = reg(finalizeTexture(fbAlb, true, 3, 3, maxAnisotropy));
  const soldierFabricNormal = reg(finalizeTexture(buildNormalFromHeight(fbHgt, 1.5), false, 3, 3, maxAnisotropy));

  // =========================================================================
  // 11. ORGANIC GEOLOGICAL ASTEROID ROCK PBR (Seamless Pixel FBM + Ridges + Craters)
  // ZERO fillRect blocks — true pixel-level geological regolith, strata & fissures!
  // =========================================================================
  const asSize = 512;
  const [asAlb, cAsAlb] = makeCanvas(asSize, asSize);
  const [asHgt, cAsHgt] = makeCanvas(asSize, asSize);
  const [asRgh, cAsRgh] = makeCanvas(asSize, asSize);

  const periodicHash = (ix: number, iy: number, period: number, seed: number): number => {
    const wx = ((ix % period) + period) % period;
    const wy = ((iy % period) + period) % period;
    const n = Math.sin(wx * 127.1 + wy * 311.7 + seed * 74.7) * 43758.5453123;
    return n - Math.floor(n);
  };

  const tileNoise = (u: number, v: number, period: number, seed: number): number => {
    const x = u * period;
    const y = v * period;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const n00 = periodicHash(ix, iy, period, seed);
    const n10 = periodicHash(ix + 1, iy, period, seed);
    const n01 = periodicHash(ix, iy + 1, period, seed);
    const n11 = periodicHash(ix + 1, iy + 1, period, seed);
    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;
    return nx0 + (nx1 - nx0) * sy;
  };

  const asAlbImg = cAsAlb.createImageData(asSize, asSize);
  const asHgtImg = cAsHgt.createImageData(asSize, asSize);
  const asRghImg = cAsRgh.createImageData(asSize, asSize);
  const aDst = asAlbImg.data;
  const hDst = asHgtImg.data;
  const rDst = asRghImg.data;

  for (let y = 0; y < asSize; y++) {
    const v = y / asSize;
    for (let x = 0; x < asSize; x++) {
      const u = x / asSize;
      // Multi-octave organic FBM + ridged geological strata + fine regolith grain
      const n1 = tileNoise(u, v, 6, 1.1);
      const n2 = tileNoise(u, v, 14, 2.7);
      const n3 = tileNoise(u, v, 30, 5.3);
      const n4 = tileNoise(u, v, 64, 9.1);
      const grain = tileNoise(u, v, 128, 13.7);

      // Ridged fracture strata (warped subtly along U/V)
      const warpU = u + (n1 - 0.5) * 0.14;
      const warpV = v + (n2 - 0.5) * 0.12;
      const ridgeA = 1.0 - Math.abs(tileNoise(warpU, warpV, 10, 17.3) * 2.0 - 1.0);
      const ridgeB = 1.0 - Math.abs(tileNoise(warpU, warpV, 24, 23.9) * 2.0 - 1.0);
      const strata = Math.sin((warpV * 8.0 + n1 * 1.4) * Math.PI * 2.0) * 0.5 + 0.5;

      const fbm = n1 * 0.42 + n2 * 0.28 + n3 * 0.16 + n4 * 0.09 + grain * 0.05;
      const hVal = Math.max(
        0,
        Math.min(1, fbm * 0.52 + ridgeA * ridgeA * 0.24 + ridgeB * 0.14 + strata * 0.10),
      );

      // Subtle mineral pigment shift (warm silicate, cool slate, dark basalt crevices)
      const mineral = tileNoise(u, v, 8, 31.4);
      const baseLum = 68 + hVal * 116;
      const rCol = Math.min(255, Math.max(0, Math.round(baseLum * (1.03 + (mineral - 0.5) * 0.14))));
      const gCol = Math.min(255, Math.max(0, Math.round(baseLum * (0.99 + (mineral - 0.5) * 0.06))));
      const bCol = Math.min(255, Math.max(0, Math.round(baseLum * (0.93 - (mineral - 0.5) * 0.10))));

      // Dry rocky regolith roughness (matte dusty stone everywhere, subtle mineral cleavage contrast)
      const roughByte = Math.min(
        252,
        Math.max(178, Math.round(240 - ridgeA * ridgeA * 34 - (1 - fbm) * 16 + grain * 14)),
      );
      const hByte = Math.round(hVal * 255);

      const idx = (y * asSize + x) * 4;
      aDst[idx] = rCol;
      aDst[idx + 1] = gCol;
      aDst[idx + 2] = bCol;
      aDst[idx + 3] = 255;

      hDst[idx] = hByte;
      hDst[idx + 1] = hByte;
      hDst[idx + 2] = hByte;
      hDst[idx + 3] = 255;

      rDst[idx] = roughByte;
      rDst[idx + 1] = roughByte;
      rDst[idx + 2] = roughByte;
      rDst[idx + 3] = 255;
    }
  }
  cAsAlb.putImageData(asAlbImg, 0, 0);
  cAsHgt.putImageData(asHgtImg, 0, 0);
  cAsRgh.putImageData(asRghImg, 0, 0);

  // Subtle organic eroded regolith depressions (irregular ellipticals, zero sharp polka-dot rings!)
  for (let i = 0; i < 18; i++) {
    const cx = hash2(i, 2.2) * asSize;
    const cy = hash2(i, 7.6) * asSize;
    const rad = 14 + Math.pow(hash2(i, 11.4), 1.35) * 44;
    const stretchX = 0.72 + hash2(i, 5.1) * 0.56;
    const stretchY = 0.72 + hash2(i, 8.3) * 0.56;
    const tilt = hash2(i, 13.9) * Math.PI;
    for (const ox of [-asSize, 0, asSize]) {
      for (const oy of [-asSize, 0, asSize]) {
        const px = cx + ox;
        const py = cy + oy;
        if (px + rad * 1.4 < 0 || px - rad * 1.4 > asSize || py + rad * 1.4 < 0 || py - rad * 1.4 > asSize) continue;

        cAsAlb.save();
        cAsAlb.translate(px, py);
        cAsAlb.rotate(tilt);
        cAsAlb.scale(stretchX, stretchY);
        const g = cAsAlb.createRadialGradient(0, 0, rad * 0.05, 0, 0, rad);
        g.addColorStop(0, 'rgba(26, 24, 22, 0.34)');
        g.addColorStop(0.55, 'rgba(38, 36, 33, 0.20)');
        g.addColorStop(0.84, 'rgba(148, 142, 134, 0.14)');
        g.addColorStop(1, 'rgba(110, 105, 98, 0)');
        cAsAlb.fillStyle = g;
        cAsAlb.beginPath();
        cAsAlb.arc(0, 0, rad, 0, Math.PI * 2);
        cAsAlb.fill();
        cAsAlb.restore();

        cAsHgt.save();
        cAsHgt.translate(px, py);
        cAsHgt.rotate(tilt);
        cAsHgt.scale(stretchX, stretchY);
        const hg = cAsHgt.createRadialGradient(0, 0, rad * 0.05, 0, 0, rad);
        hg.addColorStop(0, 'rgba(36, 36, 36, 0.48)');
        hg.addColorStop(0.62, 'rgba(72, 72, 72, 0.28)');
        hg.addColorStop(0.86, 'rgba(196, 196, 196, 0.22)');
        hg.addColorStop(1, 'rgba(128, 128, 128, 0)');
        cAsHgt.fillStyle = hg;
        cAsHgt.beginPath();
        cAsHgt.arc(0, 0, rad, 0, Math.PI * 2);
        cAsHgt.fill();
        cAsHgt.restore();
      }
    }
  }

  // Jagged fractured rock fissures & restrained mineral cleavage cracks
  for (let i = 0; i < 24; i++) {
    let fx = hash2(i, 3.7) * asSize;
    let fy = hash2(i, 6.2) * asSize;
    const isVein = i >= 19;
    cAsAlb.strokeStyle = isVein ? 'rgba(176, 166, 152, 0.18)' : 'rgba(20, 19, 18, 0.42)';
    cAsAlb.lineWidth = isVein ? 1.8 : 1.5;
    cAsHgt.strokeStyle = isVein ? 'rgba(190, 190, 190, 0.36)' : 'rgba(26, 26, 26, 0.62)';
    cAsHgt.lineWidth = isVein ? 2.0 : 2.2;
    cAsRgh.strokeStyle = isVein ? 'rgba(154, 154, 154, 0.55)' : 'rgba(248, 248, 248, 0.45)';
    cAsRgh.lineWidth = isVein ? 2.4 : 2.0;

    cAsAlb.beginPath();
    cAsHgt.beginPath();
    cAsRgh.beginPath();
    cAsAlb.moveTo(fx, fy);
    cAsHgt.moveTo(fx, fy);
    cAsRgh.moveTo(fx, fy);
    let ang = hash2(i, 15.1) * Math.PI * 2;
    for (let seg = 0; seg < 6; seg++) {
      ang += (hash2(i * 7 + seg, 9.3) - 0.5) * 1.15;
      const step = 12 + hash2(i * 5 + seg, 4.4) * 18;
      fx += Math.cos(ang) * step;
      fy += Math.sin(ang) * step;
      cAsAlb.lineTo(fx, fy);
      cAsHgt.lineTo(fx, fy);
      cAsRgh.lineTo(fx, fy);
    }
    cAsAlb.stroke();
    cAsHgt.stroke();
    cAsRgh.stroke();
  }

  const asteroidRockAlbedo = reg(finalizeTexture(asAlb, true, 2, 2, maxAnisotropy));
  const asteroidRockNormal = reg(finalizeTexture(buildNormalFromHeight(asHgt, 3.8), false, 2, 2, maxAnisotropy));
  const asteroidRockRoughness = reg(finalizeTexture(asRgh, false, 2, 2, maxAnisotropy));

  // =========================================================================
  // 12. 1024x1024 MILITARY AEROSPACE HULL PLATING PBR (Player Starfighters)
  // =========================================================================
  const shSize = 1024;
  const [shAlb, cShAlb] = makeCanvas(shSize, shSize);
  const [shHgt, cShHgt] = makeCanvas(shSize, shSize);
  const [shRgh, cShRgh] = makeCanvas(shSize, shSize);
  cShAlb.fillStyle = '#9aa4b0';
  cShAlb.fillRect(0, 0, shSize, shSize);
  cShHgt.fillStyle = '#9c9c9c';
  cShHgt.fillRect(0, 0, shSize, shSize);
  cShRgh.fillStyle = '#747474';
  cShRgh.fillRect(0, 0, shSize, shSize);

  const shPanels: ReadonlyArray<[number, number, number, number, string, string]> = [
    [0, 0, 512, 256, '#96a1ad', '#686868'],
    [512, 0, 512, 256, '#a5afb9', '#7b7b7b'],
    [0, 256, 340, 256, '#8c96a2', '#606060'],
    [340, 256, 344, 256, '#a9b3be', '#808080'],
    [684, 256, 340, 256, '#919ba8', '#6a6a6a'],
    [0, 512, 512, 280, '#a0aab5', '#747474'],
    [512, 512, 512, 280, '#88929e', '#5e5e5e'],
    [0, 792, 384, 232, '#959fab', '#767676'],
    [384, 792, 640, 232, '#a3acb7', '#6c6c6c'],
  ];

  for (const [x, y, w, h, col, rgh] of shPanels) {
    cShAlb.fillStyle = col;
    cShAlb.fillRect(x + 3, y + 3, w - 6, h - 6);
    cShRgh.fillStyle = rgh;
    cShRgh.fillRect(x + 3, y + 3, w - 6, h - 6);
    cShHgt.fillStyle = '#b8b8b8';
    cShHgt.fillRect(x + 3, y + 3, w - 6, h - 6);

    // Subtle brushed-titanium inner edge highlight
    cShAlb.strokeStyle = 'rgba(225, 234, 245, 0.22)';
    cShAlb.lineWidth = 2;
    cShAlb.strokeRect(x + 5, y + 5, w - 10, h - 10);

    // Deep recessed hairline panel seams
    cShAlb.strokeStyle = '#303740';
    cShAlb.lineWidth = 3.5;
    cShAlb.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    cShHgt.strokeStyle = '#1f1f1f';
    cShHgt.lineWidth = 5;
    cShHgt.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

    // Sub-panel inspection hatch inside larger panels
    if (w >= 480) {
      const hx = x + w * 0.56;
      const hy = y + 38;
      const hw = 148;
      const hh = 86;
      cShAlb.fillStyle = 'rgba(72, 80, 92, 0.28)';
      cShAlb.fillRect(hx, hy, hw, hh);
      cShAlb.strokeStyle = '#38404a';
      cShAlb.lineWidth = 2.5;
      cShAlb.strokeRect(hx, hy, hw, hh);
      cShHgt.strokeStyle = '#323232';
      cShHgt.lineWidth = 3.5;
      cShHgt.strokeRect(hx, hy, hw, hh);
    }

    // Crisp recessed titanium fastener rivets
    for (let rx = x + 24; rx < x + w - 18; rx += 42) {
      cShAlb.fillStyle = '#48515c';
      cShAlb.beginPath();
      cShAlb.arc(rx, y + 14, 2.4, 0, Math.PI * 2);
      cShAlb.arc(rx, y + h - 14, 2.4, 0, Math.PI * 2);
      cShAlb.fill();
      cShHgt.fillStyle = '#4a4a4a';
      cShHgt.beginPath();
      cShHgt.arc(rx, y + 14, 2.6, 0, Math.PI * 2);
      cShHgt.arc(rx, y + h - 14, 2.6, 0, Math.PI * 2);
      cShHgt.fill();
    }
  }

  // Recessed armored cooling louver grates & thermal radiator bays
  for (const [vx, vy] of [
    [68, 304],
    [728, 572],
    [94, 836],
  ] as const) {
    cShAlb.fillStyle = '#2d343d';
    cShAlb.fillRect(vx, vy, 184, 96);
    cShHgt.fillStyle = '#262626';
    cShHgt.fillRect(vx, vy, 184, 96);
    cShRgh.fillStyle = '#c4c4c4';
    cShRgh.fillRect(vx, vy, 184, 96);
    for (let ly = vy + 10; ly < vy + 90; ly += 13) {
      cShAlb.fillStyle = '#606b78';
      cShAlb.fillRect(vx + 10, ly, 164, 5);
      cShHgt.fillStyle = '#9a9a9a';
      cShHgt.fillRect(vx + 10, ly, 164, 5);
    }
  }

  // Fine longitudinal brushed-metal grain & aerodynamic carbon/scorch wear streaks
  for (let i = 0; i < 1100; i++) {
    const sx = hash2(i, 4.1) * shSize;
    const sy = hash2(i, 9.7) * shSize;
    const len = 24 + hash2(i, 2.6) * 92;
    cShAlb.fillStyle =
      i % 4 === 0 ? 'rgba(24, 29, 36, 0.13)' : 'rgba(228, 236, 245, 0.065)';
    cShAlb.fillRect(sx, sy, 2.4, len);
    cShRgh.fillStyle = i % 2 === 0 ? 'rgba(42, 42, 42, 0.12)' : 'rgba(170, 170, 170, 0.08)';
    cShRgh.fillRect(sx, sy, 2.2, len);
  }

  // Low-visibility military aerospace maintenance markings & hazard chevrons
  cShAlb.fillStyle = 'rgba(46, 54, 64, 0.62)';
  cShAlb.fillRect(558, 54, 164, 10);
  cShAlb.fillRect(558, 72, 82, 6);
  cShAlb.fillStyle = 'rgba(148, 56, 44, 0.56)';
  cShAlb.fillRect(558, 92, 46, 8);
  cShAlb.fillStyle = 'rgba(48, 56, 68, 0.68)';
  cShAlb.font = 'bold 22px monospace';
  cShAlb.fillText('VX-94 // NO STEP', 558, 128);

  const shipHullAlbedo = reg(finalizeTexture(shAlb, true, 2, 2, maxAnisotropy));
  const shipHullNormal = reg(finalizeTexture(buildNormalFromHeight(shHgt, 2.8), false, 2, 2, maxAnisotropy));
  const shipHullRoughness = reg(finalizeTexture(shRgh, false, 2, 2, maxAnisotropy));

  // =========================================================================
  // 13. 1024x1024 HEAVY CAPITAL & MEDIUM WARSHIP ARMOR PLATING PBR
  // =========================================================================
  const ewSize = 1024;
  const [ewAlb, cEwAlb] = makeCanvas(ewSize, ewSize);
  const [ewHgt, cEwHgt] = makeCanvas(ewSize, ewSize);
  cEwAlb.fillStyle = '#4e5662';
  cEwAlb.fillRect(0, 0, ewSize, ewSize);
  cEwHgt.fillStyle = '#8c8c8c';
  cEwHgt.fillRect(0, 0, ewSize, ewSize);

  for (let gy = 0; gy < ewSize; gy += 96) {
    let gx = 0;
    while (gx < ewSize) {
      const bw = 72 + Math.floor(hash2(gx + 11, gy + 7) * 140);
      const w = Math.min(bw, ewSize - gx);
      const tone = 62 + Math.floor(hash2(gx * 0.3, gy * 0.7) * 48);
      cEwAlb.fillStyle = `rgb(${tone}, ${tone + 5}, ${tone + 11})`;
      cEwAlb.fillRect(gx + 3, gy + 3, w - 6, 90);
      const ht = 108 + Math.floor(hash2(gx * 0.9, gy * 0.4) * 76);
      cEwHgt.fillStyle = `rgb(${ht}, ${ht}, ${ht})`;
      cEwHgt.fillRect(gx + 3, gy + 3, w - 6, 90);

      // Deep armored bulkhead seam + subtle top bevel
      cEwAlb.strokeStyle = '#1e232a';
      cEwAlb.lineWidth = 3.5;
      cEwAlb.strokeRect(gx + 1.5, gy + 1.5, w - 3, 93);
      cEwHgt.strokeStyle = '#1a1a1a';
      cEwHgt.lineWidth = 4.5;
      cEwHgt.strokeRect(gx + 1.5, gy + 1.5, w - 3, 93);

      // Recessed radiator louvres, maintenance hatches, or armored ribs
      const detailRoll = hash2(gx + 3, gy + 19);
      if (detailRoll > 0.58 && w >= 84) {
        cEwAlb.fillStyle = '#252b34';
        cEwAlb.fillRect(gx + 14, gy + 22, w - 28, 44);
        cEwHgt.fillStyle = '#2e2e2e';
        cEwHgt.fillRect(gx + 14, gy + 22, w - 28, 44);
        for (let sx = gx + 20; sx < gx + w - 20; sx += 11) {
          cEwAlb.fillStyle = '#48525f';
          cEwAlb.fillRect(sx, gy + 26, 4.5, 36);
          cEwHgt.fillStyle = '#b4b4b4';
          cEwHgt.fillRect(sx, gy + 26, 4.5, 36);
        }
      } else if (detailRoll < 0.25 && w >= 96) {
        // Horizontal heavy armor stiffening rib
        cEwAlb.fillStyle = `rgb(${tone + 14}, ${tone + 19}, ${tone + 26})`;
        cEwAlb.fillRect(gx + 12, gy + 38, w - 24, 18);
        cEwHgt.fillStyle = '#e0e0e0';
        cEwHgt.fillRect(gx + 12, gy + 38, w - 24, 18);
      }
      gx += w;
    }
  }
  // Micro-meteorite pitting, carbon blast scoring & brushed steel wear
  for (let i = 0; i < 1400; i++) {
    const x = hash2(i, 3.1) * ewSize;
    const y = hash2(i, 8.2) * ewSize;
    const len = 14 + hash2(i, 6.1) * 34;
    cEwAlb.fillStyle = i % 2 === 0 ? 'rgba(16, 20, 26, 0.22)' : 'rgba(176, 188, 204, 0.09)';
    cEwAlb.fillRect(x, y, len, 2.5);
  }
  const enemyWarshipAlbedo = reg(finalizeTexture(ewAlb, true, 3, 2, maxAnisotropy));
  const enemyWarshipNormal = reg(finalizeTexture(buildNormalFromHeight(ewHgt, 3.4), false, 3, 2, maxAnisotropy));

  return {
    cityGlassAlbedo,
    cityGlassNormal,
    cityGlassRoughness,
    cityGlassEmissive,
    cityStoneAlbedo,
    cityStoneNormal,
    cityStoneRoughness,
    ruinFacadeAlbedo,
    ruinFacadeNormal,
    roadAlbedo,
    roadNormal,
    terrainEarthAlbedo,
    terrainRockAlbedo,
    terrainNormal,
    obsidianAlbedo,
    obsidianNormal,
    sovereignArmorAlbedo,
    sovereignArmorNormal,
    sovereignArmorRoughness,
    sovereignCapeNormal,
    waterNormal,
    smokeSprite,
    glowSprite,
    contactShadow,
    hologramSign,
    soldierFaceAlbedo,
    soldierFaceNormal,
    soldierFaceRoughness,
    soldierVestAlbedo,
    soldierVestNormal,
    soldierVestRoughness,
    soldierFabricAlbedo,
    soldierFabricNormal,
    asteroidRockAlbedo,
    asteroidRockNormal,
    asteroidRockRoughness,
    shipHullAlbedo,
    shipHullNormal,
    shipHullRoughness,
    enemyWarshipAlbedo,
    enemyWarshipNormal,
    dispose: () => {
      for (const t of all) t.dispose();
    },
  };
}
