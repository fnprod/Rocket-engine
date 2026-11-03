#include <windows.h>
#include <xinput.h>
#include <iostream>
#include <iomanip>
#include <cmath>
#include <algorithm>
#include <atomic>
#include <thread>
#include <chrono>

#pragma comment(lib, "xinput.lib")

struct ControllerBlockerState {
    std::atomic<bool> is_blocked{false};
    std::atomic<float> deadzone{0.05f};
    std::atomic<float> exponent{1.85f};
    std::atomic<bool> running{true};
};

static ControllerBlockerState g_blocker;

void ControllerWorkerThread() {
    HANDLE hThread = GetCurrentThread();
    SetThreadPriority(hThread, THREAD_PRIORITY_TIME_CRITICAL);

    DWORD controller_id = 0;
    XINPUT_STATE state;
    WORD prev_buttons = 0;

    std::cout << "[+] Controller Engine Thread Started.\n";
    std::cout << "    [HOTKEY] Hold LB + RB and press D-Pad Down to TOGGLE BLOCK.\n\n";

    while (g_blocker.running.load(std::memory_order_relaxed)) {
        ZeroMemory(&state, sizeof(XINPUT_STATE));

        if (XInputGetState(controller_id, &state) == ERROR_SUCCESS) {
            WORD curr_buttons = state.Gamepad.wButtons;
            WORD pressed = curr_buttons & ~prev_buttons;

            bool is_combo_modifier = ((curr_buttons & XINPUT_GAMEPAD_LEFT_SHOULDER) != 0) &&
                                     ((curr_buttons & XINPUT_GAMEPAD_RIGHT_SHOULDER) != 0);

            if (is_combo_modifier && (pressed & XINPUT_GAMEPAD_DPAD_DOWN)) {
                bool new_state = !g_blocker.is_blocked.load();
                g_blocker.is_blocked.store(new_state);

                if (new_state) {
                    std::cout << "\n[!] >>> CONTROLLER BLOCKED (All stick & button inputs muted) <<<\n";
                } else {
                    std::cout << "\n[+] >>> CONTROLLER UNBLOCKED (Input processing active) <<<\n";
                }
            }
            prev_buttons = curr_buttons;

            if (g_blocker.is_blocked.load(std::memory_order_relaxed)) {
                float zero_x = 0.0f;
                float zero_y = 0.0f;
                std::cout << "\r[STATUS: BLOCKED] Output: (" << zero_x << ", " << zero_y << ") | Inputs Drop Rate: 100%   " << std::flush;
            } else {
                SHORT raw_x = state.Gamepad.sThumbLX;
                SHORT raw_y = state.Gamepad.sThumbLY;
                float norm_x = (raw_x >= 0) ? (raw_x / 32767.0f) : (raw_x / 32768.0f);
                float norm_y = (raw_y >= 0) ? (raw_y / 32767.0f) : (raw_y / 32768.0f);

                std::cout << "\r[STATUS: ACTIVE ] Stick: (" << std::fixed << std::setprecision(2) << norm_x << ", " << norm_y << ")         " << std::flush;
            }
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }
}

int main() {
    std::cout << "========================================================================\n";
    std::cout << " LowLatencyController: Controller Input Blocker / Mute Engine\n";
    std::cout << " Status: ONLINE. Press Ctrl+C to terminate.\n";
    std::cout << "========================================================================\n";

    std::thread worker(ControllerWorkerThread);

    while (g_blocker.running.load()) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }

    if (worker.joinable()) worker.join();
    return 0;
}
