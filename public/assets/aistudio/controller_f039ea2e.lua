local curves = require("curves")
local json = require("json_parser")

local controller = {}

controller.version = "1.7.0-profiles-enabled"

controller.CURVE_TYPES = {
    LINEAR           = "linear",
    POWER            = "power",
    POWER_LUT        = "power_lut",
    POWER_LUT_DIRECT = "power_lut_direct",
    SMOOTHSTEP       = "smoothstep",
    ACCELERATE       = "accelerate"
}

controller.active_profile = "default"
controller.config_dir = "config/"

controller.config = {
    deadzone   = 0.05,
    curve_type = controller.CURVE_TYPES.POWER_LUT_DIRECT,
    exponent   = 2.0,
    threshold  = 0.85,
    multiplier = 1.4
}

function controller.load_config(filepath)
    filepath = filepath or (controller.config_dir .. "config.json")
    local f = io.open(filepath, "r")
    if not f then
        return false, "Could not open config file: " .. filepath
    end
    local content = f:read("*a")
    f:close()

    local parsed = json.decode(content)
    if parsed then
        if parsed.deadzone then controller.config.deadzone = parsed.deadzone end
        if parsed.curve_type then controller.config.curve_type = parsed.curve_type end
        if parsed.exponent then
            controller.config.exponent = parsed.exponent
            if curves.init_power_lut then
                curves.init_power_lut(parsed.exponent)
            end
        end
        if parsed.threshold then controller.config.threshold = parsed.threshold end
        if parsed.multiplier then controller.config.multiplier = parsed.multiplier end
        return true, controller.config
    end
    return false, "Failed to parse JSON"
end

-- دالة التبديل التلقائي بين البروفايلات باسم البروفايل فقط
function controller.switch_profile(profile_name)
    local target_path = controller.config_dir .. profile_name .. ".json"
    local success, err = controller.load_config(target_path)
    if success then
        controller.active_profile = profile_name
        return true, controller.config
    end
    -- تجربة كمسار ملف مباشر إذا تم تمرير الامتداد
    local fallback_success, fallback_err = controller.load_config(profile_name)
    if fallback_success then
        controller.active_profile = profile_name
        return true, controller.config
    end
    return false, err
end

function controller.process_input(axis_x, axis_y, curve_override)
    local deadzone = controller.config.deadzone
    local magnitude = math.sqrt(axis_x * axis_x + axis_y * axis_y)

    if magnitude < deadzone then
        return 0.0, 0.0, false
    end

    local norm_x = axis_x / magnitude
    local norm_y = axis_y / magnitude
    local raw_magnitude = math.min(1.0, (magnitude - deadzone) / (1.0 - deadzone))

    local ctype = curve_override or controller.config.curve_type
    local curved_magnitude = raw_magnitude

    if ctype == controller.CURVE_TYPES.POWER_LUT_DIRECT and curves.power_lut_direct then
        curved_magnitude = curves.power_lut_direct(raw_magnitude)
    elseif ctype == controller.CURVE_TYPES.POWER_LUT and curves.power_lut_lerp then
        curved_magnitude = curves.power_lut_lerp(raw_magnitude)
    elseif ctype == controller.CURVE_TYPES.POWER then
        curved_magnitude = curves.power(raw_magnitude, controller.config.exponent)
    elseif ctype == controller.CURVE_TYPES.SMOOTHSTEP then
        curved_magnitude = curves.smoothstep(raw_magnitude)
    elseif ctype == controller.CURVE_TYPES.ACCELERATE then
        curved_magnitude = curves.accelerate(raw_magnitude, controller.config.threshold, controller.config.multiplier)
    else
        curved_magnitude = curves.linear(raw_magnitude)
    end

    return norm_x * curved_magnitude, norm_y * curved_magnitude, true
end

controller.load_config()

return controller
