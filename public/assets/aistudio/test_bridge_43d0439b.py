import json
import ctypes
import os

class ControllerConfig(ctypes.Structure):
    _pack_ = 1
    _fields_ = [
        ("deadzone", ctypes.c_float),
        ("curve_type", ctypes.c_int),
        ("exponent", ctypes.c_float),
        ("threshold", ctypes.c_float),
        ("multiplier", ctypes.c_float),
    ]

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

# تحميل المكتبة المجمعة
dll_path = os.path.abspath("bin/controller_core.dll")
core = ctypes.CDLL(dll_path)

# تعريف أنواع الدوال
core.InitEngine.argtypes = []
core.InitEngine.restype = None

core.SetConfig.argtypes = [ctypes.POINTER(ControllerConfig)]
core.SetConfig.restype = None

core.ProcessInputHardware.argtypes = [ctypes.c_float, ctypes.c_float]
core.ProcessInputHardware.restype = ProcessResult

# 1. قراءة إعدادات config.json
with open("config/config.json", "r") as f:
    raw_cfg = json.load(f)

# 2. تحويل البيانات إلى C Struct
c_cfg = ControllerConfig(
    deadzone=float(raw_cfg["deadzone"]),
    curve_type=CURVE_MAP.get(raw_cfg["curve_type"], 2),
    exponent=float(raw_cfg["exponent"]),
    threshold=float(raw_cfg["threshold"]),
    multiplier=float(raw_cfg["multiplier"])
)

# 3. التهيئة وتمرير الإعدادات للذاكرة المشتركة C++ مباشرة
core.InitEngine()
core.SetConfig(ctypes.byref(c_cfg))

print("========================================================================")
print(" [+] Successfully injected config.json directly into C++ Hardware Core!")
print(f" [+] Applied Struct: Deadzone={c_cfg.deadzone:.2f} | CurveID={c_cfg.curve_type} | Exp={c_cfg.exponent:.2f}")
print("========================================================================")

# اختبار المعالجة من داخل الـ C++ DLL مباشرة
test_x, test_y = 0.55, 0.35
res = core.ProcessInputHardware(test_x, test_y)

print(f" Raw Stick Input : X={test_x:.2f}, Y={test_y:.2f}")
print(f" C++ Core Output : X={res.x:.4f}, Y={res.y:.4f} | Active={res.active}")
print("========================================================================")
