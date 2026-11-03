import json
import ctypes
import os
import time

class ProcessResult(ctypes.Structure):
    _pack_ = 1
    _fields_ = [
        ("x", ctypes.c_float),
        ("y", ctypes.c_float),
        ("active", ctypes.c_bool),
    ]

CURVE_MAP = {
    "linear": 0,
    "power": 1,
    "power_lut_direct": 2,
    "smoothstep": 3,
    "accelerate": 4
}

# تحميل المكتبة وتحديد أنواع المدخلات لدالة التبديل المباشرة
dll_path = os.path.abspath("bin/controller_core.dll")
core = ctypes.CDLL(dll_path)

core.InitEngine.argtypes = []
core.InitEngine.restype = None

core.UpdateProfileDirect.argtypes = [
    ctypes.c_float, ctypes.c_int, ctypes.c_float, ctypes.c_float, ctypes.c_float
]
core.UpdateProfileDirect.restype = None

core.ProcessInputHardware.argtypes = [ctypes.c_float, ctypes.c_float]
core.ProcessInputHardware.restype = ProcessResult

core.InitEngine()

def switch_profile_hardware(profile_name):
    filepath = f"config/{profile_name}.json"
    if not os.path.exists(filepath):
        print(f"[-] Profile not found: {filepath}")
        return False

    with open(filepath, "r") as f:
        cfg = json.load(f)

    c_type = CURVE_MAP.get(cfg.get("curve_type", "power_lut_direct"), 2)
    dz     = float(cfg.get("deadzone", 0.05))
    exp    = float(cfg.get("exponent", 2.0))
    thresh = float(cfg.get("threshold", 0.85))
    mult   = float(cfg.get("multiplier", 1.4))

    # حقن المعايير مباشرة في C++ Memory
    t0 = time.perf_counter_ns()
    core.UpdateProfileDirect(dz, c_type, exp, thresh, mult)
    t_diff = time.perf_counter_ns() - t0

    print(f"[+] Switched to profile '{profile_name}' in {t_diff} ns!")
    print(f"    Deadzone={dz} | CurveID={c_type} | Exp={exp} | LUT Refreshed.")
    return True

print("========================================================================")
print(" Testing Real-time Hardware Profile Switching:")
print("========================================================================")

test_x, test_y = 0.55, 0.35

# 1. التبديل إلى بروفايل Rocket League
switch_profile_hardware("rocket_league")
res1 = core.ProcessInputHardware(test_x, test_y)
print(f" -> Output Vector: X={res1.x:.4f}, Y={res1.y:.4f} (Active={res1.active})")
print("------------------------------------------------------------------------")

# 2. التبديل اللحظي إلى بروفايل FPS Precision
switch_profile_hardware("fps_precision")
res2 = core.ProcessInputHardware(test_x, test_y)
print(f" -> Output Vector: X={res2.x:.4f}, Y={res2.y:.4f} (Active={res2.active})")
print("========================================================================")
