#include <windows.h>
#include <xinput.h>
#include <iostream>
#include <cmath>
#include <algorithm>
#include <iomanip>
#include <chrono>
#include <thread>
#include <vector>
#include <string>

#pragma comment(lib, "xinput.lib")

typedef LONG(NTAPI* pfnNtSetTimerResolution)(ULONG DesiredResolution, BOOLEAN SetResolution, PULONG CurrentResolution);
typedef LONG(NTAPI* pfnNtQueryTimerResolution)(PULONG MaximumResolution, PULONG MinimumResolution, PULONG CurrentResolution);

static pfnNtSetTimerResolution  NtSetTimerResolution = nullptr;
static pfnNtQueryTimerResolution NtQueryTimerResolution = nullptr;

class NativeTimerHolder {
public:
    ULONG actual_res = 0;
    bool  is_active = false;

    bool initialize() {
        HMODULE ntdll = GetModuleHandleW(L"ntdll.dll");
        if (!ntdll) return false;

        NtSetTimerResolution = (pfnNtSetTimerResolution)GetProcAddress(ntdll, "NtSetTimerResolution");
        NtQueryTimerResolution = (pfnNtQueryTimerResolution)GetProcAddress(ntdll, "NtQueryTimerResolution");

        if (!NtSetTimerResolution || !NtQueryTimerResolution) return false;

        ULONG min_res, max_res, cur_res;
        NtQueryTimerResolution(&max_res, &min_res, &cur_res);
        LONG status = NtSetTimerResolution(5000, TRUE, &actual_res);

        if (status >= 0) {
            is_active = true;
            return true;
        }
        return false;
    }

    ~NativeTimerHolder() {
        if (is_active && NtSetTimerResolution) {
            ULONG dummy;
            NtSetTimerResolution(actual_res, FALSE, &dummy);
        }
    }
};

enum class CurveType {
    Linear = 0,
    Power_LUT_Direct = 1,
    Smoothstep = 2,
    Accelerate = 3
};

struct Profile {
    std::string name;
    float deadzone;
    CurveType curve;
    float exponent;
    float threshold;
    float multiplier;
};

struct ProcessResult {
    float x;
    float y;
    bool active;
};

// هيكل تحكم بالاهتزاز بدون تجميد حلقة المعالجة
struct RumbleController {
    DWORD controller_id = 0;
    bool is_rumbling = false;
    std::chrono::high_resolution_clock::time_point stop_time;

    void trigger(WORD left_motor, WORD right_motor, int duration_ms) {
        XINPUT_VIBRATION vib;
        vib.wLeftMotorSpeed = left_motor;
        vib.wRightMotorSpeed = right_motor;
        XInputSetState(controller_id, &vib);

        stop_time = std::chrono::high_resolution_clock::now() + std::chrono::milliseconds(duration_ms);
        is_rumbling = true;
    }

    void update() {
        if (is_rumbling) {
            if (std::chrono::high_resolution_clock::now() >= stop_time) {
                XINPUT_VIBRATION zero_vib = { 0, 0 };
                XInputSetState(controller_id, &zero_vib);
                is_rumbling = false;
            }
        }
    }
};

static const int LUT_SIZE = 4095;
static float g_power_lut[4096];

static void init_lut(float exp) {
    for (int i = 0; i <= LUT_SIZE; ++i) {
        float norm = static_cast<float>(i) / static_cast<float>(LUT_SIZE);
        g_power_lut[i] = std::pow(norm, exp);
    }
}

static std::vector<Profile> g_profiles = {
    { "Rocket League", 0.05f, CurveType::Power_LUT_Direct, 1.85f, 0.85f, 1.4f }, // LB + Up
    { "FPS Precision", 0.03f, CurveType::Smoothstep,       2.00f, 0.90f, 1.2f }, // LB + Right
    { "Linear Raw",    0.00f, CurveType::Linear,           1.00f, 0.00f, 1.0f }, // LB + Down
    { "Aggressive",    0.06f, CurveType::Accelerate,       2.20f, 0.75f, 1.6f }  // LB + Left
};

static int g_active_idx = 0;

static ProcessResult process_stick(float raw_x, float raw_y, const Profile& prof) {
    float mag = std::sqrt(raw_x * raw_x + raw_y * raw_y);
    if (mag < prof.deadzone) return { 0.0f, 0.0f, false };

    float norm_x = raw_x / mag;
    float norm_y = raw_y / mag;
    float raw_mag = std::min(1.0f, (mag - prof.deadzone) / (1.0f - prof.deadzone));

    float curved_mag = raw_mag;
    switch (prof.curve) {
        case CurveType::Power_LUT_Direct: {
            int idx = static_cast<int>(raw_mag * static_cast<float>(LUT_SIZE) + 0.5f);
            if (idx > LUT_SIZE) idx = LUT_SIZE;
            curved_mag = g_power_lut[idx];
            break;
        }
        case CurveType::Smoothstep:
            curved_mag = raw_mag * raw_mag * (3.0f - 2.0f * raw_mag);
            break;
        case CurveType::Accelerate:
            if (raw_mag > prof.threshold) {
                float excess = (raw_mag - prof.threshold) / (1.0f - prof.threshold);
                curved_mag = raw_mag + (excess * (prof.multiplier - 1.0f) * (1.0f - prof.threshold));
                curved_mag = std::min(1.0f, curved_mag);
            }
            break;
        default:
            curved_mag = raw_mag;
            break;
    }
    return { norm_x * curved_mag, norm_y * curved_mag, true };
}

static inline void precise_sleep_until(LARGE_INTEGER target_qpc, LARGE_INTEGER qpc_freq) {
    LARGE_INTEGER current_qpc;
    QueryPerformanceCounter(&current_qpc);

    while (true) {
        double rem_sec = static_cast<double>(target_qpc.QuadPart - current_qpc.QuadPart) / qpc_freq.QuadPart;
        if (rem_sec <= 0.00008) break;
        std::this_thread::yield();
        QueryPerformanceCounter(&current_qpc);
    }

    while (current_qpc.QuadPart < target_qpc.QuadPart) {
        _mm_pause();
        QueryPerformanceCounter(&current_qpc);
    }
}

int main() {
    NativeTimerHolder timer;
    timer.initialize();

    HANDLE hThread = GetCurrentThread();
    SetThreadPriority(hThread, THREAD_PRIORITY_TIME_CRITICAL);
    SetThreadAffinityMask(hThread, (1ULL << 2));

    LARGE_INTEGER qpc_freq;
    QueryPerformanceFrequency(&qpc_freq);

    init_lut(g_profiles[g_active_idx].exponent);

    std::cout << "========================================================================\n";
    std::cout << " LowLatencyController: Zero-Jitter 1000Hz Engine + Haptic Rumble\n";
    std::cout << " Combos: [LB + DPad] to switch profiles. (Tactile click feedback enabled)\n";
    std::cout << " Move Left Analog Stick to test. Press Ctrl+C to exit.\n";
    std::cout << "========================================================================\n";

    DWORD controller_id = 0;
    XINPUT_STATE state;
    ZeroMemory(&state, sizeof(XINPUT_STATE));

    if (XInputGetState(controller_id, &state) != ERROR_SUCCESS) {
        std::cout << "[-] Gamepad not detected at Index 0.\n";
        return 1;
    }
    std::cout << "[+] Gamepad Connected on Index 0!\n\n";

    RumbleController rumble;
    rumble.controller_id = controller_id;

    WORD prev_buttons = 0;
    LARGE_INTEGER next_frame_qpc;
    QueryPerformanceCounter(&next_frame_qpc);
    int64_t interval_ticks = qpc_freq.QuadPart / 1000;
    LARGE_INTEGER last_poll_qpc = next_frame_qpc;

    while (true) {
        next_frame_qpc.QuadPart += interval_ticks;
        precise_sleep_until(next_frame_qpc, qpc_freq);

        LARGE_INTEGER current_qpc;
        QueryPerformanceCounter(&current_qpc);
        double actual_delta_us = (static_cast<double>(current_qpc.QuadPart - last_poll_qpc.QuadPart) / qpc_freq.QuadPart) * 1e6;
        last_poll_qpc = current_qpc;

        // تحديث إيقاف محركات الاهتزاز إذا انتهت مدة النبضة
        rumble.update();

        ZeroMemory(&state, sizeof(XINPUT_STATE));
        if (XInputGetState(controller_id, &state) == ERROR_SUCCESS) {
            WORD curr_buttons = state.Gamepad.wButtons;
            WORD pressed = curr_buttons & ~prev_buttons;
            bool is_lb_held = (curr_buttons & XINPUT_GAMEPAD_LEFT_SHOULDER) != 0;

            if (is_lb_held) {
                int new_idx = g_active_idx;
                if (pressed & XINPUT_GAMEPAD_DPAD_UP)    new_idx = 0;
                if (pressed & XINPUT_GAMEPAD_DPAD_RIGHT) new_idx = 1;
                if (pressed & XINPUT_GAMEPAD_DPAD_DOWN)  new_idx = 2;
                if (pressed & XINPUT_GAMEPAD_DPAD_LEFT)  new_idx = 3;

                if (new_idx != g_active_idx) {
                    g_active_idx = new_idx;
                    if (g_profiles[g_active_idx].curve == CurveType::Power_LUT_Direct) {
                        init_lut(g_profiles[g_active_idx].exponent);
                    }
                    
                    // إطلاق نبضة لمسية سريعة وخفيفة (مدة 75ms)
                    rumble.trigger(22000, 14000, 75);

                    std::cout << "\n[!] >>> Switched to: " << g_profiles[g_active_idx].name 
                              << " [Haptic Click Sent]\n\n";
                }
            }
            prev_buttons = curr_buttons;

            SHORT raw_x = state.Gamepad.sThumbLX;
            SHORT raw_y = state.Gamepad.sThumbLY;
            float norm_in_x = (raw_x >= 0) ? (raw_x / 32767.0f) : (raw_x / 32768.0f);
            float norm_in_y = (raw_y >= 0) ? (raw_y / 32767.0f) : (raw_y / 32768.0f);

            auto t0 = std::chrono::high_resolution_clock::now();
            ProcessResult out = process_stick(norm_in_x, norm_in_y, g_profiles[g_active_idx]);
            auto t1 = std::chrono::high_resolution_clock::now();
            double math_nanos = std::chrono::duration<double, std::nano>(t1 - t0).count();

            std::cout << "\r[" << std::left << std::setw(13) << g_profiles[g_active_idx].name << "] "
                      << "IN: (" << std::fixed << std::setprecision(2) << std::setw(5) << norm_in_x << "," << std::setw(5) << norm_in_y << ") "
                      << "OUT: (" << std::setw(5) << out.x << "," << std::setw(5) << out.y << ") "
                      << "Period: " << std::setw(6) << static_cast<int>(actual_delta_us) << "us "
                      << "Lat: " << std::setw(3) << static_cast<int>(math_nanos) << "ns "
                      << std::flush;
        }
    }

    return 0;
}
