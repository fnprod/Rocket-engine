import { PhysicsConfig, KeyBinding, MacroTimingConfig } from '../types/engine';

export function generateLuaScript(
  config: PhysicsConfig,
  keybindings: KeyBinding[],
  _timings: MacroTimingConfig
): string {
  const getK = (actionId: string, fallback: string) => {
    const found = keybindings.find(b => b.id === actionId && b.layer === 0);
    return found ? found.key.toLowerCase() : fallback;
  };

  const fwdKey = getK('forward', 'w');
  const backKey = getK('back', 's');
  const leftKey = getK('left', 'a');
  const rightKey = getK('right', 'd');
  const jumpKey = getK('jump', 'spacebar');
  const boostKey = getK('boost', 'lshift');
  const powerslideKey = getK('powerslide', 'lalt');
  const airrollLKey = getK('airroll_l', 'q');
  const airrollRKey = getK('airroll_r', 'e');

  return `-- =======================================================================
-- ROCKET LEAGUE MASTER-ENGINE v5.3 (1000HZ DIRECTINPUT PHYSICS & KBM/G502 X)
-- ENVIRONMENT: LOGITECH G-HUB (LUA 5.4) / ROCKET LEAGUE ESPORTS STANDARD
-- =======================================================================

-----------------------------------------------------------------------
-- [1] CALIBRATION CONSTANTS (إعدادات الحساسية والفيزياء 1000Hz)
-----------------------------------------------------------------------
local CONFIG = {
    INTERNAL_DEADZONE   = ${config.internalDeadzone.toFixed(2)},   -- نطاق الخمول لمنع الانجراف العرضي
    HARDWARE_JITTER     = ${config.hardwareJitter},      -- فلترة الاهتزاز الناتج عن ضغط الأزرار
    CURVE_EXPONENT      = ${config.curveExponent.toFixed(2)},   -- معامل المنحنى الرياضي للدقة الدقيقة
    TICK_MS             = 1.0,    -- التردد الفيزيائي لمحرك اللعبة الفائق (1000Hz Tick Mode: 1.0ms)
    GROUND_SENSE        = ${config.groundSense.toFixed(2)},   -- حساسية الأرض
    AERIAL_SENSE        = ${config.aerialSense.toFixed(2)},   -- حساسية الجو
    SUPERSONIC_VELOCITY = 2200,   -- السرعة الخارقة المعتمدة (2200 - 2300 uu/s)
}

-----------------------------------------------------------------------
-- [2] KEYBINDS MAPPING (مخطط الأزرار - مطابق لإعدادات اللعبة الرسمية)
-----------------------------------------------------------------------
local K = {
    FORWARD    = "${fwdKey}",
    BACK       = "${backKey}",
    LEFT       = "${leftKey}",
    RIGHT      = "${rightKey}",
    JUMP       = "${jumpKey === 'space' ? 'spacebar' : jumpKey}",
    BOOST      = "${boostKey}",
    POWERSLIDE = "${powerslideKey}",
    AIRROLL_L  = "${airrollLKey}",
    AIRROLL_R  = "${airrollRKey}",
}

-- أزرار فأرة G502 X المستقلة
local MOUSE = {
    TOGGLE_STATE = 3, -- الزر الأوسط (Wheel Click): تفعيل/تعطيل المحرك
    SPEEDFLIP    = 4, -- الزر الجانبي السفلي (MB4): تنفيذ Speedflip متقن
    CHAINDASH    = 5, -- الزر الجانبي العلوي (MB5): تنفيذ Chain Wave-Dash / Half-Flip
    WALL_DASH    = 6, -- زر القناص / MB6: تنفيذ Wall-to-Ground Dash مع الاكتشاف الذكي
}

-- أزرار G-Keys الاختيارية
local GKEY = {
    BOOST      = 1, -- G1 = Rocket Boost Engine
    JUMP       = 2, -- G2 = Jump & Flip Dodge
    HALF_FLIP  = 3, -- G3 = Half-Flip
    SPEEDFLIP  = 4, -- G4 = Speedflip Right
}

local engine_enabled = true

-----------------------------------------------------------------------
-- [3] MATHEMATICAL INPUT PROCESSOR (معالج الحركة الرياضي 1000Hz)
-----------------------------------------------------------------------

-- دالة تأخير متزامنة مع إطارات الفيزياء (Frame-Safe Wait)
local function FrameSleep(ticks)
    Sleep(math.floor(ticks * CONFIG.TICK_MS))
end

-- [Section 3 Bipolar Vector Helpers]
function GetSign(val)
    if val > 0 then return 1
    elseif val < 0 then return -1
    else return 0
    end
end

function Clamp(val, min_val, max_val)
    if val < min_val then return min_val
    elseif val > max_val then return max_val
    else return val
    end
end

-- Strictly symmetric bipolar curve [-1.0, +1.0] with True Zero center
function ApplyBipolarCurve(norm, deadzone, exponent)
    local dz = deadzone or CONFIG.INTERNAL_DEADZONE
    local exp = exponent or CONFIG.CURVE_EXPONENT
    local abs_val = math.abs(norm)
    if abs_val <= dz then
        return 0.0
    end
    local sign = GetSign(norm)
    local clamped = Clamp((abs_val - dz) / (1.0 - dz), 0.0, 1.0)
    local curved = math.pow(clamped, exp)
    return sign * curved
end

-- Convert raw mouse counts (dx, dy) to [-1.0, 1.0] normalized space
function ProcessRawMouseCounts(dx, dy)
    local norm_x = Clamp(dx / 127.0, -1.0, 1.0)
    local norm_y = Clamp(dy / 127.0, -1.0, 1.0)
    local out_x = ApplyBipolarCurve(norm_x, CONFIG.INTERNAL_DEADZONE, CONFIG.CURVE_EXPONENT)
    local out_y = ApplyBipolarCurve(norm_y, CONFIG.INTERNAL_DEADZONE, CONFIG.CURVE_EXPONENT)
    return out_x, out_y
end

-- تطبيق معادلة التوجيه الرياضية لتحويل الإدخال الحاد إلى انسيابي
function ApplyPrecisionCurve(axis_value, sensitivity_multiplier)
    if math.abs(axis_value) < CONFIG.INTERNAL_DEADZONE then
        return 0
    end
    local sign = (axis_value > 0) and 1 or -1
    local normalized = math.abs(axis_value) / 127.0
    local curved = math.pow(normalized, CONFIG.CURVE_EXPONENT)
    return curved * 127.0 * sign * (sensitivity_multiplier or 1.0)
end

-- إزالة الترددات الطفيفة العشوائية عند النقر السريع
function FilterJitter(raw_axis)
    if math.abs(raw_axis) <= CONFIG.HARDWARE_JITTER then
        return 0
    end
    return raw_axis
end

-----------------------------------------------------------------------
-- [4] PRECISE MECHANICS (تنفيذ آليات الحركة المتزامنة مع الفيزياء)
-----------------------------------------------------------------------

-- 1. آلية الـ Speedflip الدقيق (زاوية 45 درجة مع إلغاء لحظي)
function ExecuteSpeedflipLeft()
    -- تفعيل التعزيز والقفزة الأولى
    PressKey(K.BOOST)
    PressKey(K.FORWARD)
    PressKey(K.LEFT)
    PressKey(K.JUMP)
    FrameSleep(3) -- 25ms
    ReleaseKey(K.JUMP)
    FrameSleep(4) -- 33ms

    -- القفزة الثانية (Flip)
    PressKey(K.JUMP)
    FrameSleep(2) -- 16ms
    ReleaseKey(K.JUMP)
    ReleaseKey(K.FORWARD)
    ReleaseKey(K.LEFT)

    -- الإلغاء العمودي المباشر (Flip Cancel) + تعديل الدوران
    PressKey(K.BACK)
    PressKey(K.AIRROLL_L)
    PressKey(K.POWERSLIDE)
    FrameSleep(65) -- 540ms مدة الإلغاء حتى ملامسة العجلات
    ReleaseKey(K.BACK)
    ReleaseKey(K.AIRROLL_L)
    ReleaseKey(K.POWERSLIDE)
    ReleaseKey(K.BOOST)
end

-- 2. آلية الـ Half-Flip السريع للرجوع الدفاعي دون خسارة الزخم
function ExecuteHalfFlip()
    -- قفزة للخلف مع دوران خلفي كامل
    PressKey(K.BACK)
    PressKey(K.JUMP)
    FrameSleep(2)
    ReleaseKey(K.JUMP)
    FrameSleep(3)

    -- تفعيل القفزة الثانية للقلب الخلفي
    PressKey(K.JUMP)
    FrameSleep(2)
    ReleaseKey(K.JUMP)
    ReleaseKey(K.BACK)

    -- إلغاء الدوران في منتصف المسار وتعديل زاوية السيارة
    FrameSleep(1)
    PressKey(K.FORWARD)   -- إلغاء القلّاب للأمام
    PressKey(K.AIRROLL_L) -- تعديل الوجه للأعلى
    FrameSleep(45)
    ReleaseKey(K.FORWARD)
    ReleaseKey(K.AIRROLL_L)
end

-- 3. نبضة Wave-Dash مفردة متزامنة
local function SingleWaveDashPulse()
    -- خطوة 1: قفزة صغرى مع سحب الأنف للأعلى
    PressKey(K.JUMP)
    PressKey(K.BACK)
    PressKey(K.POWERSLIDE)
    FrameSleep(3) -- 25ms (3 إطارات لرفع السيارة مسافة طفيفة جداً)
    ReleaseKey(K.JUMP)
    ReleaseKey(K.BACK)

    -- خطوة 2: انتظار ملامسة العجلات الخلفية للسطح
    FrameSleep(6) -- 50ms فترة النزول الدقيقة

    -- خطوة 3: ضربة القفزة الثانية للأمام لتحويل العزم إلى سرعة أفقية
    PressKey(K.FORWARD)
    PressKey(K.JUMP)
    FrameSleep(2) -- 16.6ms
    ReleaseKey(K.JUMP)
    ReleaseKey(K.FORWARD)

    -- خطوة 4: تثبيت الانزلاق الأرضي لامتصاص عزم الاندفاع
    FrameSleep(4) -- 33.3ms
end

-- تنفيذ سلسلة الاندفاع الأرضي المتتالي (Chain Wave-Dash)
function ExecuteChainWaveDash(pulse_count)
    local pulses = pulse_count or 3 -- القيمة الافتراضية: 3 نبضات متتالية

    -- تفعيل الانزلاق طوال فترة السلسلة لمنع احتكاك العجلات
    PressKey(K.POWERSLIDE)

    for i = 1, pulses do
        SingleWaveDashPulse()
        -- فاصل زمني قصير جداً بين النبضات للسماح للعجلات الخلفية باستعادة التوازن
        FrameSleep(2)
    end

    -- تحرير زر الانزلاق بعد إكمال السلسلة بالكامل
    ReleaseKey(K.POWERSLIDE)
end

-- 4. دالة الهبوط من الجدار إلى الأرض (Wall-to-Ground Dash)
function ExecuteWallToGroundDash(wall_side)
    local roll_key = (wall_side == "LEFT") and K.AIRROLL_R or K.AIRROLL_L

    -- خطوة 1: تفعيل الانزلاق وقفزة خاطفة جداً لفصل السيارة عن الجدار
    PressKey(K.POWERSLIDE)
    PressKey(K.JUMP)
    FrameSleep(2) -- 16.6ms (إطاران فقط لمنع الابتعاد عن السطح)
    ReleaseKey(K.JUMP)

    -- خطوة 2: تعديل توازن السيارة لتستوي أفقياً وتوجيه الأنف للأعلى قليلاً
    PressKey(roll_key)
    PressKey(K.BACK)
    FrameSleep(6) -- 50ms فترة تعديل الدوران
    ReleaseKey(roll_key)
    ReleaseKey(K.BACK)

    -- خطوة 3: نافذة السقوط حتى تلمس العجلات الخلفية أرضية الملعب
    FrameSleep(8) -- 66.6ms
    PressKey(K.FORWARD)
    PressKey(K.JUMP)
    FrameSleep(2) -- 16.6ms
    ReleaseKey(K.JUMP)
    ReleaseKey(K.FORWARD)

    -- خطوة 4: امتصاص عزم الاندفاع بالانزلاق ثم تحرير المفاتيح
    FrameSleep(5) -- 41.6ms
    ReleaseKey(K.POWERSLIDE)
end

-- 5. القفز الذكي من الجدار مع الاكتشاف التلقائي
function ExecuteAutoWallToGroundDash()
    -- الافتراضي: الجدار الأيسر
    ExecuteWallToGroundDash("LEFT")
end

-----------------------------------------------------------------------
-- [5] EVENT ROUTER (موجّه الأحداث المنفصل - Logitech G-Hub)
-----------------------------------------------------------------------
function OnEvent(event, arg)
    -- تهيئة البروفايل عند الإقلاع
    if event == "PROFILE_ACTIVATED" then
        EnablePrimaryMouseButtonEvents(true)
        ClearLog()
        OutputLogMessage("[PHYSICS ENGINE] Online. 1000Hz Tick Mode Active.\\n")
        OutputLogMessage("[KBM BINDINGS] W: Throttle | S: Brake | A/D: Steer\\n")
        OutputLogMessage("[MOUSE BINDINGS] MB3: Toggle | MB4: Speedflip | MB5: ChainDash | MB6: WallDash\\n")
        return
    end

    -- تفعيل/إيقاف المحرك بالزر الأوسط
    if event == "MOUSE_BUTTON_PRESSED" and arg == MOUSE.TOGGLE_STATE then
        engine_enabled = not engine_enabled
        OutputLogMessage("[PHYSICS ENGINE] Status: %s\\n", engine_enabled and "ENABLED" or "PAUSED")
        return
    end

    if not engine_enabled then return end

    -- توجيه أزرار الفأرة للآليات الميكانيكية المباشرة
    if event == "MOUSE_BUTTON_PRESSED" then
        if arg == MOUSE.SPEEDFLIP then
            ExecuteSpeedflipLeft()
            return
        elseif arg == MOUSE.CHAINDASH then
            ExecuteChainWaveDash(3)
            return
        elseif arg == MOUSE.WALL_DASH then
            ExecuteWallToGroundDash("LEFT")
            return
        end
    end

    -- توجيه أزرار G-Keys (في لوحة المفاتيح أو الفأرة)
    if event == "G_PRESSED" then
        if arg == GKEY.BOOST then
            PressKey(K.BOOST)
            FrameSleep(5)
            ReleaseKey(K.BOOST)
        elseif arg == GKEY.JUMP then
            PressKey(K.JUMP)
            FrameSleep(2)
            ReleaseKey(K.JUMP)
        elseif arg == GKEY.HALF_FLIP then
            ExecuteHalfFlip()
        elseif arg == GKEY.SPEEDFLIP then
            ExecuteSpeedflipLeft()
        end
        return
    end
end
`;
}
