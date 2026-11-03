# FNPro Master Engine: System Architecture & Hardware Data Pipeline
**Target Platform:** Windows 11 Pro 64-bit  
**Core Runtime:** Tauri v2 (Rust Backend) + React 19 / TypeScript / Vite / Tailwind CSS  
**Primary Engine Tick:** 1000Hz (1.0ms DirectInput polling rate)  
**Author:** userfn-git (`fnprospace@gmail.com`)  
**Repository:** [https://github.com/userfn-git/FNProMasterEngine.git](https://github.com/userfn-git/FNProMasterEngine.git)

---

## 1. Dual-Path Data Architecture

```
                  ┌────────────────────────────────────────┐
                  │ 1000Hz DirectInput Keyboard (WASD/Air) │
                  └───────────────────┬────────────────────┘
                                      │
                   [Hot-Path: Sub-microsecond P/Invoke]
                                      │
              ┌───────────────────────▼───────────────────────┐
              │   %TEMP%\FNProMasterEngine\buffers\           │
              │   io_ring_buffer.bin (Lock-free binary ring)  │
              └───────────────────────┬───────────────────────┘
                                      │
                     [Analytical Flush on Match Save]
                                      │
              ┌───────────────────────▼───────────────────────┐
              │   %APPDATA%\FNProMasterEngine\                │
              │   fnpro_telemetry.db (SQLite WAL Mode)        │
              └───────────────────────────────────────────────┘
```

### Hot-Path (1000Hz DirectInput Hook)
- Uses Win32 `user32.dll` `SendInput` with direct hardware scancodes (`0x11` for W, `0x1F` for S, `0x1E` for A, `0x20` for D, `0x39` for Space, `0x2A` for LShift).
- High-frequency telemetry streams to `%TEMP%\FNProMasterEngine\buffers\io_ring_buffer.bin` to eliminate SSD write amplification and avoid micro-stutters during high-speed 2200-2300 uu/s gameplay.

### Cold-Path (SQLite WAL Database)
- Database path: `%APPDATA%\FNProMasterEngine\fnpro_telemetry.db`.
- Operates under `PRAGMA journal_mode = WAL;` and `PRAGMA synchronous = NORMAL;`.
- Tables:
  1. `engine_sessions`: Tracks session GUID, machine hardware ID, user account, engine mode.
  2. `physics_calibrations`: Records deadzone values, exponential curves, ground/aerial sensitivities.
  3. `input_telemetry_ticks`: Time-series ticks with latency, velocity, and supersonic status.
  4. `replay_analytics_vault`: Stored binary replay telemetry and Ballchasing.com statistics.

---

## 2. Hardware Fingerprint & Vault Security
- Machine GUID is extracted directly from Windows registry `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid`.
- CPU Processor ID and GPU hardware properties are hashed using SHA-256 into a unique hardware identity `FNPRO-HWID-XXXXXXXX`.
- Encrypted credentials, Epic Online Services tokens, and Ballchasing.com keys are kept in `%APPDATA%\FNProMasterEngine\vault.key`.

---

## 3. Logitech G-HUB UUIDv4 Deployment Architecture
- Replaces flat script writes with authentic G-HUB directory structures:
  `%LOCALAPPDATA%\LGHUB\scripts\{UUIDv4}\script.lua`
- Lua 5.4 validation ensures syntax correctness and verified 1000Hz tick loop parameters (`TICK_MS = 1`).

---

## 4. Rocket League Log & Temp Buffer Integration
- Background watcher checks `%USERPROFILE%\Documents\My Games\Rocket League\TAGame\Logs\Launch.log`.
- Extracts live map transitions (`DFHStadium_P`), Player Net IDs, match session GUIDs, and 120Hz server tick rates without modifying game binary files.

---

## 5. Continuous Kinematic Vector Math [-1.0, +1.0]
- Eliminates discrete frame counters in favor of continuous 2D/3D force vectors:
  * Steer, Pitch, Roll in range `[-1.0, +1.0]` with True Zero center.
- **Symmetric Deadzone & Exponent Curve:**
  $$f(x) = \text{sgn}(x) \cdot \left(\text{clamp}\left(\frac{|x| - \text{deadzone}}{1.0 - \text{deadzone}}, 0.0, 1.0\right)\right)^{1.35}$$
  Guarantees $f(-1.0) = -1.0$, $f(0.0) = 0.0$, and $f(+1.0) = +1.0$ without directional bias.
- **Supersonic Velocity State Machine (2200 to 2300 uu/s):**
  * Absolute Max Engine Speed = 2300.0 uu/s.
  * 2200.0 uu/s represents exactly 95.65% (0.9565) of max velocity.
  * Band Ratio: $P_{\text{supersonic}} = \text{clamp}\left(\frac{\text{velocity} - 2200.0}{2300.0 - 2200.0}, 0.0, 1.0\right)$.
  * Friction bleeding penalty: occurs when sharp steering ($|\text{Steer}| > 0.8$) is executed while $P_{\text{supersonic}} > 0.5$.

---

## 6. 2D Polar Vector Scope & Mechanics Codex
- Continuous polar coordinates sampling from fast-path `%TEMP%` buffer.
- Target angle cones (e.g. $30^\circ\text{--}42^\circ$ for Speedflip) plotted on polar grid with magnitude rings $(0.25, 0.50, 0.75, 1.00)$.
- Real-time cross-axis torque leakage evaluation:
  $$\text{Leakage \%} = \frac{|\text{Roll}|}{\sqrt{\text{Steer}^2 + \text{Pitch}^2} + |\text{Roll}|} \times 100$$
- Injects validated physical time constants directly into `MacroTimelineEditor`.

---

## 7. Modular Tauri v2 Commands Architecture (Rust error[E0255] Resolution)
- **Problem Fixed:** Inlining 28+ `#[tauri::command]` functions in `lib.rs` caused macro symbol collisions (`__cmd__*` and `__tauri_command_name_*` re-exported multiple times).
- **Architecture:** All 28 commands are centralized in `src-tauri/src/commands/mod.rs` without duplicate exports.
- **Root Binding:** `src-tauri/src/lib.rs` mounts `pub mod commands;` and binds handlers via `tauri::generate_handler![commands::*]`.
- **Pure System Helpers:** `get_fnpro_appdata_dir()` and `get_fnpro_temp_dir()` remain public in `lib.rs` for clear separation of concerns.

---

## 8. 5 C++ Native Hardware Engines & Lua 5.4 Subsystem
1. **`controller_core.cpp` (Dynamic Link Library / DLL):**
   - 4096-LUT Direct Indexing: Replaces floating-point power equations with instantaneous 4.7 ns lookups.
   - Micro-timer hook (`NtSetTimerResolution` at 0.5ms) guaranteeing 1000Hz polling precision.
2. **`mouse_interceptor.cpp` (WH_MOUSE_LL Hook):**
   - High-performance low-level mouse hook filtering synthetic inputs tagged with `0x524C4531`.
   - Raw sensitivity conversion and circular deadzone clamping.
3. **`unified_input_engine.cpp` (Dynamic Auto-Mute Arbiter):**
   - 350ms dynamic mute window: instantly mutes controllers upon mouse/keyboard events.
   - Continuous haptic feedback dispatch and rumble telemetry.
4. **`controller_blocker.cpp` (XInput Blocker):**
   - Intercepts and silences virtual device conflicts for pristine Layer 0 isolation.
5. **`benchmark.cpp` & Lua 5.4 Suite:**
   - Real-time performance stress tests (`benchmark.lua`, `curves.lua`, `json_parser.lua`).
   - Python ctypes bridges (`test_bridge.py`, `test_profile_bridge.py`) for automated test verification.

---

## 9. Windows 11 Registry Direct Injection (1000Hz kbdclass)
- **Target Registry Key:** `HKLM\SYSTEM\CurrentControlSet\Services\kbdclass\Parameters`
  * `KeyboardDataQueueSize` = `dword:00000100` (256 packets)
  * `PollStatusIterations` = `dword:00000001` (Instantaneous IRQ evaluation)
- **Multimedia System Profile:** `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games`
  * `Priority` = `6`, `GPU Priority` = `8`, `Clock Rate` = `10000 (0x2710)`
- **UI Integrations:** 1-Click Direct Inject, Copy `.reg` code, and Download `.reg` file in `KeybindLayerZero.tsx`.

---

## 10. GitHub Sync & Repository Automation
- **Author:** `userfn-git` | `fnprospace@gmail.com`
- **Repository Target:** `https://github.com/userfn-git/FNProMasterEngine.git`
- **Modal Component:** `src/components/GitHubSyncModal.tsx` rendered via Header button next to Launch RL.
- **Workflow:** 1-Click sync button, terminal commands copy, and `sync_github_repo.bat` auto-generation.


