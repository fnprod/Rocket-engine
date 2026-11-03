#include <windows.h>
#include <cmath>
#include <algorithm>
#include <iostream>

#pragma pack(push, 1)
struct ControllerConfig {
    float deadzone;
    int   curve_type; // 0: Linear, 1: Power, 2: Power_LUT_Direct, 3: Smoothstep, 4: Accelerate
    float exponent;
    float threshold;
    float multiplier;
};

struct ProcessResult {
    float x;
    float y;
    bool  active;
};
#pragma pack(pop)

static ControllerConfig g_config = { 0.05f, 2, 2.0f, 0.85f, 1.4f };
static const int LUT_SIZE = 4095;
static float g_power_lut[4096];

static void rebuild_lut(float exp) {
    for (int i = 0; i <= LUT_SIZE; ++i) {
        float norm = (float)i / (float)LUT_SIZE;
        g_power_lut[i] = std::pow(norm, exp);
    }
}

extern "C" {
    __declspec(dllexport) void InitEngine() {
        rebuild_lut(g_config.exponent);
    }

    __declspec(dllexport) void SetConfig(const ControllerConfig* cfg) {
        if (!cfg) return;
        bool exp_changed = (std::abs(g_config.exponent - cfg->exponent) > 0.0001f);
        g_config = *cfg;
        if (exp_changed) {
            rebuild_lut(g_config.exponent);
        }
    }

    // دالة تبديل بروفايل مباشرة وسريعة عبر تمرير المعاملات الأولية
    __declspec(dllexport) void UpdateProfileDirect(float deadzone, int curve_type, float exponent, float threshold, float multiplier) {
        bool exp_changed = (std::abs(g_config.exponent - exponent) > 0.0001f);
        g_config.deadzone   = deadzone;
        g_config.curve_type = curve_type;
        g_config.exponent   = exponent;
        g_config.threshold  = threshold;
        g_config.multiplier = multiplier;

        if (exp_changed) {
            rebuild_lut(g_config.exponent);
        }
    }

    __declspec(dllexport) ProcessResult ProcessInputHardware(float axis_x, float axis_y) {
        float magnitude = std::sqrt(axis_x * axis_x + axis_y * axis_y);
        if (magnitude < g_config.deadzone) {
            return { 0.0f, 0.0f, false };
        }

        float norm_x = axis_x / magnitude;
        float norm_y = axis_y / magnitude;
        float raw_mag = std::min(1.0f, (magnitude - g_config.deadzone) / (1.0f - g_config.deadzone));

        float curved_mag = raw_mag;
        switch (g_config.curve_type) {
            case 1: { // Power Math
                curved_mag = std::pow(raw_mag, g_config.exponent);
                break;
            }
            case 2: { // Power LUT Direct 4096
                int idx = (int)(raw_mag * (float)LUT_SIZE + 0.5f);
                if (idx > LUT_SIZE) idx = LUT_SIZE;
                curved_mag = g_power_lut[idx];
                break;
            }
            case 3: { // Smoothstep
                curved_mag = raw_mag * raw_mag * (3.0f - 2.0f * raw_mag);
                break;
            }
            case 4: { // Accelerate
                if (raw_mag > g_config.threshold) {
                    float excess = (raw_mag - g_config.threshold) / (1.0f - g_config.threshold);
                    curved_mag = raw_mag + (excess * (g_config.multiplier - 1.0f) * (1.0f - g_config.threshold));
                    curved_mag = std::min(1.0f, curved_mag);
                }
                break;
            }
            default: // Linear
                curved_mag = raw_mag;
                break;
        }

        return { norm_x * curved_mag, norm_y * curved_mag, true };
    }
}
