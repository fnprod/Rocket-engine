# FNPro Master Engine (Windows 11 Native Architecture)

**Target Platform:** Windows 11 Pro 64-bit  
**Core Runtime:** Tauri v2 (Rust Backend MSVC) + React 19 / TypeScript 5.8 / Vite / Tailwind CSS  
**Engine Polling:** DirectInput 1000Hz (1.0ms resolution)  
**Author:** userfn-git (`fnprospace@gmail.com`)  
**Repository:** [https://github.com/userfn-git/FNProMasterEngine.git](https://github.com/userfn-git/FNProMasterEngine.git)

---

## Overview

FNPro Master Engine is a production-grade, standalone Windows 11 desktop engineering utility for Rocket League competitive esports. Built with zero web mocks, zero localStorage fallbacks, and zero hardcoded credentials, the engine operates directly at the hardware and kernel boundary.

### Key Capabilities
1. **Continuous Kinematic Vector Math [-1.0, +1.0]**:
   - Replaces discrete frame counters with continuous 2D/3D force vectors: Steer, Pitch, Roll.
   - Symmetric Deadzone & Exponent Curve:
     $$f(x) = \text{sgn}(x) \cdot \left(\text{clamp}\left(\frac{|x| - \text{deadzone}}{1.0 - \text{deadzone}}, 0.0, 1.0\right)\right)^{1.35}$$
     Guarantees strict mathematical symmetry: $f(-1.0) = -1.0$, $f(0.0) = 0.0$, $f(+1.0) = +1.0$.
2. **Supersonic Kinematics State Machine**:
   - Max Engine Speed: $2300.0\text{ uu/s}$.
   - $2200.0\text{ uu/s}$ threshold is exactly $95.65\%$ of max velocity.
   - Supersonic Band Ratio: $P_{\text{supersonic}} = \text{clamp}\left(\frac{v - 2200.0}{2300.0 - 2200.0}, 0.0, 1.0\right)$.
   - Friction Bleeding Penalty: decelerates vehicle when sharp steering ($|\text{Steer}| > 0.8$) occurs during $P_{\text{supersonic}} > 0.5$.
3. **2D Polar Vector Scope & RL Moves Codex**:
   - Visual circular polar radar sampling 1000Hz inputs directly from the fast-path buffer.
   - Displays continuous trajectory trace, target angle cones (e.g., Speedflip $30^\circ\text{--}42^\circ$), and measures cross-axis torque leakage in real time.
   - Local mechanics database (`src/data/rlMovesCodex.json`) with frame scrubber and "Apply Timings to Engine" injection.
4. **Logitech G-HUB Dynamic UUIDv4 Deployment**:
   - Generates scripts under `%LOCALAPPDATA%\LGHUB\scripts\{UUIDv4}\script.lua`.
   - Embeds native Bipolar Lua functions: `GetSign(val)`, `Clamp(val, min, max)`, `ApplyBipolarCurve(norm, deadzone, exponent)`.
   - Converts raw mouse counts $(dx, dy)$ to $[-1.0, 1.0]$ normalized space before curve evaluation.
   - Non-destructive syntax validation via `validate_lua_script`.
5. **Hardware Fingerprinting & Secure Vault**:
   - Native Rust extraction of `MachineGuid` from Windows Registry `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid`.
   - SHA-256 derivation of `FNPRO-HWID-XXXXXXXX`.
   - All credentials and Ballchasing.com tokens encrypted strictly in `%APPDATA%\FNProMasterEngine\vault.key`.
6. **Dual Hot/Cold Buffering & SQLite WAL**:
   - Hot-Path: `%TEMP%\FNProMasterEngine\buffers\io_ring_buffer.bin` (64KB pre-allocated ring buffer).
   - Cold-Path: `%APPDATA%\FNProMasterEngine\fnpro_telemetry.db` (WAL mode with `engine_sessions`, `physics_calibrations`, `input_telemetry_ticks`, `replay_analytics_vault`).
7. **Developer & Admin Hub**:
   - Client-side JSZip archiver packaging `fnpro-master-engine-source.zip`.
   - Automated Windows 11 bootstrapper (`install_dependencies.ps1`).
   - PowerShell DirectInput benchmarking suite (`FNProEngine.psm1`).

---

## 1-Click Windows 11 Quick Start

Run PowerShell as Administrator in the repository root:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\install_dependencies.ps1
```

To run in development mode:
```powershell
npm run tauri dev
```

To build a standalone production release executable (.exe / MSI):
```powershell
npm run tauri build
```

---

## Git Automation

```bash
git init
git config user.name "userfn-git"
git config user.email "fnprospace@gmail.com"
git add .
git commit -m "feat: complete FNPro Master Engine v4.2.0 Windows 11 native build"
git branch -M main
git remote add origin https://github.com/userfn-git/FNProMasterEngine.git
git push -u origin main
```
