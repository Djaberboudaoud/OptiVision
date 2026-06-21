import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

let loader: GLTFLoader | null = null;

export function getGLTFLoader() {
  if (!loader) {
    loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    // Using Google's gstatic CDN for Draco decoder
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);
  }
  return loader;
}

// Global cache for GLTF scenes to prevent reloading and re-parsing
const modelCache = new Map<string, any>();

// Track in-flight loads to prevent duplicate requests for the same URL
const pendingLoads = new Map<string, Promise<any>>();

/**
 * Loads a GLTF/GLB model using GLTFLoader with DRACOLoader enabled.
 * Caches the parsed scene for instant reuse across components.
 * De-duplicates concurrent requests for the same URL.
 */
export async function loadGLTFModel(url: string) {
  // 1. Return from cache instantly
  if (modelCache.has(url)) {
    return modelCache.get(url).clone();
  }
  
  // 2. If already loading, wait for the same promise (don't fire a second request)
  if (pendingLoads.has(url)) {
    const scene = await pendingLoads.get(url);
    return scene.clone();
  }
  
  // 3. Start a new load
  const loadPromise = (async () => {
    const gltfLoader = getGLTFLoader();
    const gltf = await gltfLoader.loadAsync(url);
    modelCache.set(url, gltf.scene);
    pendingLoads.delete(url);
    return gltf.scene;
  })();
  
  pendingLoads.set(url, loadPromise);
  const scene = await loadPromise;
  return scene.clone();
}

/**
 * Preload a list of model URLs in the background.
 * Uses requestIdleCallback so it doesn't block the main thread.
 * Models are loaded one-by-one with low priority.
 */
export function preloadModels(urls: string[]) {
  // Filter out already-cached and empty URLs
  const toLoad = urls.filter(url => url && !modelCache.has(url) && !pendingLoads.has(url));
  
  if (toLoad.length === 0) return;
  
  console.log(`[preloader] Queuing ${toLoad.length} models for background preload`);
  
  let index = 0;
  
  function loadNext() {
    if (index >= toLoad.length) {
      console.log(`[preloader] All ${toLoad.length} models preloaded`);
      return;
    }
    
    const url = toLoad[index++];
    
    // Use loadGLTFModel (which handles caching + dedup)
    loadGLTFModel(url)
      .then(() => {
        console.log(`[preloader] ${index}/${toLoad.length} preloaded: ${url.split('/').pop()}`);
        // Schedule next load during idle time
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => loadNext());
        } else {
          setTimeout(loadNext, 100);
        }
      })
      .catch(err => {
        console.warn(`[preloader] Failed to preload ${url}:`, err.message);
        // Continue with next model even if one fails
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => loadNext());
        } else {
          setTimeout(loadNext, 100);
        }
      });
  }
  
  // Start preloading after a short delay to let the page finish rendering first
  setTimeout(() => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => loadNext());
    } else {
      loadNext();
    }
  }, 2000);
}
