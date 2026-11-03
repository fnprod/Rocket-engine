package.path = "./src/lua/?.lua;./src/lua/?/init.lua;" .. package.path
local ctrl = require("controller")

print("================================================================")
print(" [+] Controller Version: " .. ctrl.version)
print("================================================================")

local test_x, test_y = 0.60, 0.40

local modes = {
    { type = ctrl.CURVE_TYPES.LINEAR,     params = nil },
    { type = ctrl.CURVE_TYPES.POWER,      params = { exponent = 2.0 } },
    { type = ctrl.CURVE_TYPES.SMOOTHSTEP, params = nil },
    { type = ctrl.CURVE_TYPES.ACCELERATE, params = { threshold = 0.70, multiplier = 1.5 } }
}

print(string.format(" Raw Input Vector: X=%.2f, Y=%.2f (Magnitude: %.4f)", test_x, test_y, math.sqrt(test_x^2 + test_y^2)))
print("----------------------------------------------------------------")

for _, mode in ipairs(modes) do
    ctrl.set_curve(mode.type, mode.params)
    local ox, oy, active = ctrl.process_input(test_x, test_y)
    local out_mag = math.sqrt(ox^2 + oy^2)
    print(string.format(" [%-10s] -> Out X: %6.4f | Out Y: %6.4f | Mag: %6.4f", mode.type, ox, oy, out_mag))
end
print("================================================================")
