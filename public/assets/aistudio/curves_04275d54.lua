local curves = {}

curves.version = "1.3.0-lut-direct-ready"

local LUT_4096_SIZE = 4095
local power_lut_4096 = {}
local current_exponent = 2.0

function curves.init_power_lut(exponent)
    current_exponent = exponent or 2.0
    for i = 0, LUT_4096_SIZE do
        local norm = i / LUT_4096_SIZE
        power_lut_4096[i] = norm ^ current_exponent
    end
end

-- تهيئة الجدول
curves.init_power_lut(2.0)

-- دالة الفهرسة المباشرة فائقة السرعة O(1) بدون LERP
function curves.power_lut_direct(val)
    local sign = (val >= 0) and 1.0 or -1.0
    local abs_v = math.abs(val)
    if abs_v >= 1.0 then return sign end

    local idx = math.floor(abs_v * LUT_4096_SIZE + 0.5)
    return sign * power_lut_4096[idx]
end

function curves.linear(val)
    return math.max(-1.0, math.min(1.0, val))
end

function curves.power(val, exponent)
    exponent = exponent or 2.0
    local sign = (val >= 0) and 1.0 or -1.0
    return sign * (math.abs(val) ^ exponent)
end

function curves.smoothstep(val)
    local sign = (val >= 0) and 1.0 or -1.0
    local x = math.min(1.0, math.abs(val))
    return sign * (x * x * (3.0 - 2.0 * x))
end

function curves.accelerate(val, threshold, multiplier)
    threshold = threshold or 0.85
    multiplier = multiplier or 1.4
    local sign = (val >= 0) and 1.0 or -1.0
    local abs_v = math.abs(val)
    if abs_v <= threshold then return val end
    local excess = (abs_v - threshold) / (1.0 - threshold)
    local boost = abs_v + (excess * (multiplier - 1.0) * (1.0 - threshold))
    return sign * math.min(1.0, boost)
end

return curves
