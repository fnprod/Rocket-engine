package.path = "./src/lua/?.lua;./src/lua/?/init.lua;" .. package.path
local ctrl = require("controller")

local ITERATIONS = 1000000
local test_x = 0.55
local test_y = 0.35

local test_curves = {
    { id = ctrl.CURVE_TYPES.LINEAR,           label = "Linear" },
    { id = ctrl.CURVE_TYPES.POWER,            label = "Power (Math)" },
    { id = ctrl.CURVE_TYPES.POWER_LUT,        label = "Power (LUT LERP)" },
    { id = ctrl.CURVE_TYPES.POWER_LUT_DIRECT, label = "Power (LUT Direct 4096)" },
    { id = ctrl.CURVE_TYPES.SMOOTHSTEP,       label = "Smoothstep" },
    { id = ctrl.CURVE_TYPES.ACCELERATE,       label = "Accelerate" }
}

print("=========================================================================================")
print(string.format(" Comprehensive Engine Benchmark: %d iterations per curve", ITERATIONS))
print("=========================================================================================")

for _, entry in ipairs(test_curves) do
    ctrl.set_curve(entry.id)

    -- Warmup phase
    for _ = 1, 10000 do
        ctrl.process_input(test_x, test_y)
    end

    local start_time = os.clock()
    for _ = 1, ITERATIONS do
        ctrl.process_input(test_x, test_y)
    end
    local elapsed = os.clock() - start_time

    local total_micros = elapsed * 1e6
    local avg_micros = total_micros / ITERATIONS
    local avg_nanos = avg_micros * 1000.0
    local ops = ITERATIONS / elapsed

    print(string.format(" [%-25s] Total: %6.4f s | Avg: %6.4f us (%5.1f ns) | Ops/sec: %10.0f",
        entry.label, elapsed, avg_micros, avg_nanos, ops))
end
print("=========================================================================================")
