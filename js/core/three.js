import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.157.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.157.0/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'https://unpkg.com/three@0.157.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.157.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.157.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'https://unpkg.com/three@0.157.0/examples/jsm/postprocessing/SSAOPass.js';
import { SAOPass } from 'https://unpkg.com/three@0.157.0/examples/jsm/postprocessing/SAOPass.js';
import { SMAAPass } from 'https://unpkg.com/three@0.157.0/examples/jsm/postprocessing/SMAAPass.js';

// Exportar THREE, OrbitControls e GLTFLoader separadamente
export {
    THREE,
    OrbitControls,
    GLTFLoader,
    EffectComposer,
    RenderPass,
    UnrealBloomPass,
    SSAOPass,
    SAOPass,
    SMAAPass
};
