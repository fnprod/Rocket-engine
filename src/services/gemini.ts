/**
 * Native Tauri v2 IPC Bridge for Google Gemini API & System Persistence
 * Strictly Native-First: No mock simulation, no browser localStorage fallbacks.
 * Direct communication with Rust backend via Tauri IPC channels.
 */

// Check if app is running inside native Tauri v2 desktop environment
export const isTauriDesktop = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

export interface GeminiStatus {
  isConfigured: boolean;
  source: 'ENV' | 'SECURE_NATIVE_FILE' | 'IN_MEMORY_STATE' | 'NOT_CONFIGURED';
  model: string;
}

export interface NativeSystemSpecs {
  os: string;
  target_arch: string;
  direct_input_polling_hz: number;
  webview2_runtime: string;
  appdata_path: string;
}

/**
 * Ensures Tauri IPC is available or throws a concrete native desktop error
 */
async function getTauriCore() {
  if (!isTauriDesktop()) {
    throw new Error(
      'Native Desktop Bridge Error: The application is running outside the Tauri v2 runtime. ' +
      'Please launch the program using the compiled desktop binary (rl-pro-master-engine.exe).'
    );
  }
  return await import('@tauri-apps/api/core');
}

/**
 * Checks Gemini status from Rust backend without exposing secret keys
 */
export async function checkGeminiStatus(): Promise<GeminiStatus> {
  const { invoke } = await getTauriCore();
  const res = await invoke<{ is_configured: boolean; source: string; model: string }>('get_gemini_status');
  return {
    isConfigured: res.is_configured,
    source: res.source as GeminiStatus['source'],
    model: res.model
  };
}

/**
 * Securely writes API key into Rust backend memory and %APPDATA% vault
 */
export async function saveGeminiApiKey(apiKey: string): Promise<boolean> {
  const { invoke } = await getTauriCore();
  return await invoke<boolean>('set_gemini_api_key', { apiKey });
}

/**
 * Streams Gemini AI tokens directly from Rust backend using Tauri Event Listeners.
 * No browser intervals or mock data: tokens come straight from the native stream.
 */
export async function streamGeminiResponse(
  prompt: string,
  callbacks: {
    onChunk: (chunk: string) => void;
    onComplete: () => void;
    onError: (err: string) => void;
  },
  model = 'gemini-1.5-flash'
): Promise<() => void> {
  const { invoke } = await getTauriCore();
  const { listen } = await import('@tauri-apps/api/event');

  let unlistenFn: (() => void) | null = null;

  try {
    const unlisten = await listen<{ chunk_text: string; is_final: boolean }>('gemini-chunk', (event) => {
      if (event.payload.is_final) {
        callbacks.onComplete();
        if (unlistenFn) {
          unlistenFn();
          unlistenFn = null;
        }
      } else {
        callbacks.onChunk(event.payload.chunk_text);
      }
    });

    unlistenFn = unlisten;

    // Invoke Rust backend streaming command
    await invoke('stream_gemini_generate', { prompt, model });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    callbacks.onError(msg);
    if (unlistenFn) {
      unlistenFn();
      unlistenFn = null;
    }
  }

  return () => {
    if (unlistenFn) {
      unlistenFn();
      unlistenFn = null;
    }
  };
}

/**
 * Retrieves native Windows 11 system specs and %APPDATA% path
 */
export async function getNativeSystemSpecs(): Promise<NativeSystemSpecs> {
  const { invoke } = await getTauriCore();
  return await invoke<NativeSystemSpecs>('get_system_specs');
}

/**
 * Loads configuration file directly from %APPDATA%/RocketLeagueMasterEngine/config.json
 */
export async function loadNativeConfig(): Promise<string | null> {
  const { invoke } = await getTauriCore();
  return await invoke<string | null>('load_native_config');
}

/**
 * Saves configuration file directly to %APPDATA%/RocketLeagueMasterEngine/config.json
 */
export async function saveNativeConfig(configJson: string): Promise<boolean> {
  const { invoke } = await getTauriCore();
  return await invoke<boolean>('save_native_config', { configJson });
}

/**
 * Loads custom presets directly from %APPDATA%/RocketLeagueMasterEngine/presets.json
 */
export async function loadNativePresets(): Promise<string | null> {
  const { invoke } = await getTauriCore();
  return await invoke<string | null>('load_native_presets');
}

/**
 * Saves custom presets directly to %APPDATA%/RocketLeagueMasterEngine/presets.json
 */
export async function saveNativePresets(presetsJson: string): Promise<boolean> {
  const { invoke } = await getTauriCore();
  return await invoke<boolean>('save_native_presets', { presetsJson });
}
