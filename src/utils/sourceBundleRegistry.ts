// Automatic Vite Raw File Registry for Complete Standalone Source Packaging
// Bundles the authentic live project tree into raw strings for client-side JSZip export

// Explicit root production files imported directly as raw strings (Guarantees zero truncation)
import packageJsonRaw from '../../package.json?raw';
import indexHtmlRaw from '../../index.html?raw';
import readmeRaw from '../../README.md?raw';
import architectureRaw from '../../ARCHITECTURE.md?raw';
import psm1Raw from '../../FNProEngine.psm1?raw';
import bootstrapperRaw from '../../install_dependencies.ps1?raw';
import viteConfigRaw from '../../vite.config.ts?raw';

// Explicit Tauri v2 Rust backend production files
import cargoTomlRaw from '../../src-tauri/Cargo.toml?raw';
import tauriConfRaw from '../../src-tauri/tauri.conf.json?raw';
import mainRsRaw from '../../src-tauri/src/main.rs?raw';
import libRsRaw from '../../src-tauri/src/lib.rs?raw';
import defaultCapRaw from '../../src-tauri/capabilities/default.json?raw';

// Explicit Tauri v2 icon assets encoded in base64
export const binaryIconFilesBase64: Record<string, string> = {
  'src-tauri/icons/icon.ico': 'AAABAAIAICAAAAEAIABkAAAAJgAAAICAAAABACAAAgEAAIoAAACJUE5HDQoaCgAAAA1JSERSAAAAIAAAACAIAgAAAPwY7aMAAAArSURBVHjaY2DbdoWmiGHUglELRi0YtWDUglELRi0YtWDUglELRi0YKhYAAAxtQFuHm1EiAAAAAElFTkSuQmCCiVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAAAyUlEQVR42u3RMQ0AAAgEsZ/wrwYlCEIGDE1OwTXVo8NiAQAAAgBAAAAIAAABACAAAAQAgAAAEAAAAgBAAAAIAAABACAAAAQAgAAAEAAAAgBAAAAIAAABACAAAAQAgAAAEAAAAgBAAAAIAAABACAAAAQAgAAAAOACAAACAEAAAAgAAAEAIAAABACAAAAQAAACAEAAAAgAAAEAIAAABACAAAAQAAACAEAAAAgAAAEAIAAABACAAAAQAAACAEAAAAgAAAEAIAAABOBDC1WPBd3Q4GPxAAAAAElFTkSuQmCC',
  'src-tauri/icons/icon.icns': 'aWNucwAAAQqJUE5HDQoaCgAAAA1JSERSAAAAgAAAAIAIAgAAAExc9pwAAADJSURBVHja7dExDQAACASxn/CvBiUIQgYMTU7BNdWjw2IBAAACAEAAAAgAAAEAIAAABACAAAAQAAACAEAAAAgAAAEAIAAABACAAAAQAAACAEAAAAgAAAEAIAAABACAAAAQAAACAEAAAAgAAAEAIAAABACAAAAA4AIAAAIAQAAACAAAAQAgAAAEAIAAABAAAAIAQAAACAAAAQAgAAAEAIAAABAAAAIAQAAACAAAAQAgAAAEAIAAABAAAAIAQAAACAAAAQAgAAAE4EMLVY8F3dDgY/EAAAAASUVORK5CYII=',
  'src-tauri/icons/32x32.png': 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAK0lEQVR42mNg23aFpohh1IJRC0YtGLVg1IJRC0YtGLVg1IJRC0YtGCoWAAAMbUBbh5tRIgAAAABJRU5ErkJggg==',
  'src-tauri/icons/128x128.png': 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAAAyUlEQVR42u3RMQ0AAAgEsZ/wrwYlCEIGDE1OwTXVo8NiAQAAAgBAAAAIAAABACAAAAQAgAAAEAAAAgBAAAAIAAABACAAAAQAgAAAEAAAAgBAAAAIAAABACAAAAQAgAAAEAAAAgBAAAAIAAABACAAAAQAgAAAAOACAAACAEAAAAgAAAEAIAAABACAAAAQAAACAEAAAAgAAAEAIAAABACAAAAQAAACAEAAAAgAAAEAIAAABACAAAAQAAACAEAAAAgAAAEAIAAABOBDC1WPBd3Q4GPxAAAAAElFTkSuQmCC',
  'src-tauri/icons/128x128@2x.png': 'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAACAUlEQVR42u3TMQ0AAAgEsZ/wrwYlCGJGA02q4JJL9cBbkQADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAABhABQwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADgAHAAGAAMAAYAAwABgADYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAwABgAA6iAAcAAYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAwABgADAAGAAOAAcAAYAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGAAMAAYAA4ABwABgADAAGACuBb02F3FPJ1w6AAAAAElFTkSuQmCC',
};

// Comprehensive Vite Glob for all src/ components, utilities, data, and styles
export const srcFiles = import.meta.glob('/src/**/*.{ts,tsx,css,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function getAllProjectFiles(): Record<string, string> {
  const all: Record<string, string> = {};

  // 1. Root configuration & execution scripts
  all['package.json'] = packageJsonRaw;
  all['index.html'] = indexHtmlRaw;
  all['README.md'] = readmeRaw;
  all['ARCHITECTURE.md'] = architectureRaw;
  all['FNProEngine.psm1'] = psm1Raw;
  all['install_dependencies.ps1'] = bootstrapperRaw;
  all['vite.config.ts'] = viteConfigRaw;

  // 2. Tauri v2 Rust Backend files
  all['src-tauri/Cargo.toml'] = cargoTomlRaw;
  all['src-tauri/tauri.conf.json'] = tauriConfRaw;
  all['src-tauri/src/main.rs'] = mainRsRaw;
  all['src-tauri/src/lib.rs'] = libRsRaw;
  all['src-tauri/capabilities/default.json'] = defaultCapRaw;

  // 3. Tauri v2 icon assets for Windows resource generation
  for (const [iconPath, base64Data] of Object.entries(binaryIconFilesBase64)) {
    all[iconPath] = base64Data;
  }

  // 4. Complete src/ frontend tree (Components, Utils, Data, Types, Styles)
  for (const [path, content] of Object.entries(srcFiles)) {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    all[cleanPath] = content;
  }

  return all;
}
