#include <windows.h>
#include <xinput.h>
#include <iostream>
#include <iomanip>
#include <cmath>
#include <algorithm>
#include <chrono>
#include <thread>
#include <atomic>
#include <vector>
#include <string>

#pragma comment(lib, "xinput.lib")

#define MOUSE_INJECTED_TAG 0x524C4531 // "RLE1"

typedef LONG(NTAPI* pfnNtSetTimerResolution)(ULONG DesiredResolution, BOOLEAN SetResolution, PULONG CurrentResolution);
static pfnNtSetTimerResolution NtSetTimerResolution = nullptr;

struct RumbleFeedback {
    DWORD controller_id = 0;
    std::atomic<bool> is_active{false};
    std::chrono::high_resolution_clock::time_point stop_time;

    void trigger(WORD left_motor, WORD right_motor, int duration_ms) {
        XINPUT_VIBRATION vib = { left_motor, right_motor };
        XInputSetState(controller_id, &vib);
        stop_time = std::chrono::high_resolution_clock::now() + std::chrono::milliseconds(duration_ms);
        is_active.store(true, std::memory_order_relaxed);
    }

    void update() {
        if (is_active.load(std::memory_order_relaxed)) {
            if (std::chrono::high_resolution_clock::now() >= stop_time) {
                XINPUT_VIBRATION zero = { 0, 0 };
                XInputSetState(controller_id, &zero);
                is_active.store(false, std::memory_order_relaxed);
            }
        }
    }
};

static RumbleFeedback g_rumble;

struct EngineConfig {
    std::atomic<bool>     manual_block{false};
    std::atomic<bool>     auto_mute_enabled{true};
    std::atomic<int64_t>  mouse_timeout_ms{350};
    std::atomic<int64_t>  last_mouse_activity_ns{0};

    std::atomic<float> stick_deadzone{0.05f};
    std::atomic<float> stick_exponent{1.85f};
    std::atomic<float> mouse_jitter{1.5f};
    std::atomic<float> mouse_deadzone{1.0f};
    std::atomic<float> mouse_exponent{1.45f};
    std::atomic<float> mouse_multiplier{1.20f};
    std::atomic<bool>  running{true};
    std::atomic<int>   active_profile_id{0};
};

static EngineConfig g_engine;
static HHOOK g_mouse_hook = nullptr;
static POINT g_prev_mouse_pt = { 0, 0 };
static bool  g_has_mouse_prev = false;

static const int LUT_SIZE = 4095;
static float g_stick_lut[4096];

static void init_stick_lut(float exp) {
    for (int i = 0; i <= LUT_SIZE; ++i) {
        float norm = static_cast<float>(i) / static_cast<float>(LUT_SIZE);
        g_stick_lut[i] = std::pow(norm, exp);
    }
}

static inline int64_t get_current_time_ns() {
    return std::chrono::duration_cast<std::chrono::nanoseconds>(
        std::chrono::steady_clock::now().time_since_epoch()
    ).count();
}

static inline float ApplyMouseMath(float delta) {
    float jitter = g_engine.mouse_jitter.load(std::memory_order_relaxed);
    if (std::abs(delta) < jitter) return 0.0f;

    float deadzone = g_engine.mouse_deadzone.load(std::memory_order_relaxed);
    if (std::abs(delta) < deadzone) return 0.0f;

    float sign = (delta > 0.0f) ? 1.0f : -1.0f;
    float mag = std::abs(delta);
    float norm = std::min(1.0f, mag / 127.0f);

    float exp = g_engine.mouse_exponent.load(std::memory_order_relaxed);
    float mult = g_engine.mouse_multiplier.load(std::memory_order_relaxed);

    return sign * (std::pow(norm, exp) * 127.0f * mult);
}

static void InjectProcessedMouse(int dx, int dy) {
    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dx = dx;
    input.mi.dy = dy;
    input.mi.dwFlags = MOUSEEVENTF_MOVE;
    input.mi.dwExtraInfo = MOUSE_INJECTED_TAG;
    SendInput(1, &input, sizeof(INPUT));
}

LRESULT CALLBACK LowLevelMouseProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode == HC_ACTION && wParam == WM_MOUSEMOVE) {
        MSLLHOOKSTRUCT* pMouse = reinterpret_cast<MSLLHOOKSTRUCT*>(lParam);

        if (pMouse->dwExtraInfo == MOUSE_INJECTED_TAG || (pMouse->flags & LLMHF_INJECTED)) {
            return CallNextHookEx(g_mouse_hook, nCode, wParam, lParam);
        }

        if (!g_has_mouse_prev) {
            g_prev_mouse_pt = pMouse->pt;
            g_has_mouse_prev = true;
            return 1;
        }

        int raw_dx = pMouse->pt.x - g_prev_mouse_pt.x;
        int raw_dy = pMouse->pt.y - g_prev_mouse_pt.y;
        g_prev_mouse_pt = pMouse->pt;

        if (raw_dx == 0 && raw_dy == 0) return 1;

        float jitter = g_engine.mouse_jitter.load(std::memory_order_relaxed);
        if (std::abs(raw_dx) >= jitter || std::abs(raw_dy) >= jitter) {
            g_engine.last_mouse_activity_ns.store(get_current_time_ns(), std::memory_order_release);
        }

        int final_dx = static_cast<int>(std::round(ApplyMouseMath(static_cast<float>(raw_dx))));
        int final_dy = static_cast<int>(std::round(ApplyMouseMath(static_cast<float>(raw_dy))));

        if (final_dx != 0 || final_dy != 0) {
            InjectProcessedMouse(final_dx, final_dy);
        }

        return 1;
    }
    return CallNextHookEx(g_mouse_hook, nCode, wParam, lParam);
}

void XInputPollingThread() {
    HANDLE hThread = GetCurrentThread();
    SetThreadPriority(hThread, THREAD_PRIORITY_TIME_CRITICAL);
    SetThreadAffinityMask(hThread, (1ULL << 2));

    LARGE_INTEGER qpc_freq, next_frame_qpc, current_qpc;
    QueryPerformanceFrequency(&qpc_freq);
    QueryPerformanceCounter(&next_frame_qpc);
    int64_t interval_ticks = qpc_freq.QuadPart / 1000;

    DWORD controller_id = 0;
    XINPUT_STATE state;
    WORD prev_buttons = 0;

    g_rumble.controller_id = controller_id;
    init_stick_lut(g_engine.stick_exponent.load());

    while (g_engine.running.load(std::memory_order_relaxed)) {
        next_frame_qpc.QuadPart += interval_ticks;

        while (true) {
            QueryPerformanceCounter(&current_qpc);
            if (current_qpc.QuadPart >= next_frame_qpc.QuadPart) break;
            _mm_pause();
        }

        g_rumble.update();

        ZeroMemory(&state, sizeof(XINPUT_STATE));
        if (XInputGetState(controller_id, &state) == ERROR_SUCCESS) {
            WORD curr_buttons = state.Gamepad.wButtons;
            WORD pressed = curr_buttons & ~prev_buttons;

            bool is_block_combo = ((curr_buttons & XINPUT_GAMEPAD_LEFT_SHOULDER) != 0) &&
                                  ((curr_buttons & XINPUT_GAMEPAD_RIGHT_SHOULDER) != 0);

            if (is_block_combo && (pressed & XINPUT_GAMEPAD_DPAD_DOWN)) {
                bool next_manual = !g_engine.manual_block.load();
                g_engine.manual_block.store(next_manual);

                if (next_manual) {
                    g_rumble.trigger(36000, 18000, 150);
                    std::cout << "\n[!] >>> MANUAL BLOCK ACTIVE [Outputs Frozen] <<<\n";
                } else {
                    g_rumble.trigger(20000, 30000, 60);
                    std::cout << "\n[+] >>> MANUAL BLOCK RELEASED <<<\n";
                }
            }

            bool is_lb_only = ((curr_buttons & XINPUT_GAMEPAD_LEFT_SHOULDER) != 0) &&
                              ((curr_buttons & XINPUT_GAMEPAD_RIGHT_SHOULDER) == 0);

            if (is_lb_only && !g_engine.manual_block.load(std::memory_order_relaxed)) {
                if (pressed & XINPUT_GAMEPAD_DPAD_UP) {
                    g_engine.stick_exponent.store(1.85f);
                    g_engine.stick_deadzone.store(0.05f);
                    g_engine.mouse_multiplier.store(1.20f);
                    init_stick_lut(1.85f);
                    g_engine.active_profile_id.store(0);
                    g_rumble.trigger(22000, 14000, 70);
                    std::cout << "\n[!] >>> Profile 0: Rocket League Active\n";
                } else if (pressed & XINPUT_GAMEPAD_DPAD_RIGHT) {
                    g_engine.stick_exponent.store(2.20f);
                    g_engine.stick_deadzone.store(0.03f);
                    g_engine.mouse_multiplier.store(0.85f);
                    init_stick_lut(2.20f);
                    g_engine.active_profile_id.store(1);
                    g_rumble.trigger(22000, 14000, 70);
                    std::cout << "\n[!] >>> Profile 1: FPS Precision Active\n";
                }
            }
            prev_buttons = curr_buttons;

            bool is_blocked = g_engine.manual_block.load(std::memory_order_relaxed);

            int64_t now_ns = get_current_time_ns();
            int64_t last_mouse_ns = g_engine.last_mouse_activity_ns.load(std::memory_order_acquire);
            int64_t elapsed_ms = (now_ns - last_mouse_ns) / 1000000;
            int64_t timeout_ms = g_engine.mouse_timeout_ms.load(std::memory_order_relaxed);

            bool is_auto_muted = false;
            if (g_engine.auto_mute_enabled.load(std::memory_order_relaxed)) {
                if (elapsed_ms < timeout_ms) {
                    is_auto_muted = true;
                    is_blocked = true;
                }
            }

            if (is_blocked) {
                if (is_auto_muted) {
                    std::cout << "\r[CTRL: AUTO-MUTED (Mouse Active: " << std::setw(3) << (timeout_ms - elapsed_ms)
                              << "ms)] Output: ( 0.00,  0.00)   " << std::flush;
                } else {
                    std::cout << "\r[CTRL: MANUAL BLOCKED              ] Output: ( 0.00,  0.00)   " << std::flush;
                }
            } else {
                SHORT raw_x = state.Gamepad.sThumbLX;
                SHORT raw_y = state.Gamepad.sThumbLY;
                float norm_x = (raw_x >= 0) ? (raw_x / 32767.0f) : (raw_x / 32768.0f);
                float norm_y = (raw_y >= 0) ? (raw_y / 32768.0f) : (raw_y / 32768.0f);

                float mag = std::sqrt(norm_x * norm_x + norm_y * norm_y);
                float dz = g_engine.stick_deadzone.load(std::memory_order_relaxed);

                float out_x = 0.0f, out_y = 0.0f;
                if (mag >= dz) {
                    float raw_mag = std::min(1.0f, (mag - dz) / (1.0f - dz));
                    int idx = static_cast<int>(raw_mag * static_cast<float>(LUT_SIZE) + 0.5f);
                    if (idx > LUT_SIZE) idx = LUT_SIZE;
                    float curved_mag = g_stick_lut[idx];
                    out_x = (norm_x / mag) * curved_mag;
                    out_y = (norm_y / mag) * curved_mag;
                }

                std::cout << "\r[CTRL: ACTIVE ] Stick: (" << std::fixed << std::setprecision(2) << std::setw(5) << out_x 
                          << ", " << std::setw(5) << out_y << ") | Mouse Idle: " << std::setw(4) << elapsed_ms << "ms   " << std::flush;
            }
        }
    }
}

int main() {
    HMODULE ntdll = GetModuleHandleW(L"ntdll.dll");
    if (ntdll) {
        NtSetTimerResolution = (pfnNtSetTimerResolution)GetProcAddress(ntdll, "NtSetTimerResolution");
        if (NtSetTimerResolution) {
            ULONG actual;
            NtSetTimerResolution(5000, TRUE, &actual);
        }
    }

    std::cout << "========================================================================\n";
    std::cout << " UNIFIED ENGINE: AUTO-MUTE CONTROLLER ON MOUSE MOVEMENT\n";
    std::cout << " Auto-Mute Timeout : 350 ms\n";
    std::cout << " Manual Toggle     : LB + RB + D-Pad Down\n";
    std::cout << " Profiles          : [LB + Up: Rocket League] [LB + Right: FPS]\n";
    std::cout << " Press Ctrl+C to terminate.\n";
    std::cout << "========================================================================\n";

    std::thread xinput_thread(XInputPollingThread);

    g_mouse_hook = SetWindowsHookExA(WH_MOUSE_LL, LowLevelMouseProc, GetModuleHandle(nullptr), 0);
    if (!g_mouse_hook) {
        std::cerr << "[-] Failed to hook mouse.\n";
        g_engine.running.store(false);
        xinput_thread.join();
        return 1;
    }

    MSG msg;
    while (GetMessage(&msg, nullptr, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    g_engine.running.store(false);
    UnhookWindowsHookEx(g_mouse_hook);
    if (xinput_thread.joinable()) xinput_thread.join();

    return 0;
}
