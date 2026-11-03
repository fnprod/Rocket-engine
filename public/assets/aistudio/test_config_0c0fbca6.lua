package.path = "./src/lua/?.lua;./src/lua/?/init.lua;" .. package.path
local ctrl = require("controller")

print("========================================================================")
print(" [+] Config System Initialized: " .. ctrl.version)
print(string.format(" [Current Loaded Config] Deadzone: %.2f | Curve: %s | Exp: %.2f", 
    ctrl.config.deadzone, ctrl.config.curve_type, ctrl.config.exponent))
print("========================================================================")

-- تجربة تعديل الإعدادات وحفظها برمجياً
print(" [+] Modifying config: Setting Deadzone to 0.08 and Exponent to 2.2 ...")
ctrl.config.deadzone = 0.08
ctrl.set_curve(ctrl.CURVE_TYPES.POWER_LUT_DIRECT, { exponent = 2.2 })
local ok, err = ctrl.save_config()

if ok then
    print(" [+] Config successfully saved to config/config.json!")
else
    print(" [-] Error saving config: " .. tostring(err))
end

-- إعادة التحميل للتأكيد
ctrl.load_config()
print(string.format(" [Verified Reloaded]   Deadzone: %.2f | Curve: %s | Exp: %.2f", 
    ctrl.config.deadzone, ctrl.config.curve_type, ctrl.config.exponent))
print("========================================================================")
