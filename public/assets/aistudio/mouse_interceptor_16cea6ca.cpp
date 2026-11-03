#include <windows.h>
#include <iostream>
#include <cmath>
#include <algorithm>
#include <chrono>

#define CUSTOM_INJECTED_TAG 0x524C4531 // "RLE1" لمنع الحلقة اللانهائية

struct MouseCurveConfig {
    float internal_deadzone = 1.0f; // بالبكسل/الدلتا
    float hardware_jitter   = 1.5f;
    float exponent          = 1.45f;
    float sensitivity_mult  = 1.20f;
};

static MouseCurveConfig g_cfg;
static HHOOK g_mouse_hook = nullptr;
static POINT g_prev_pt = { 0, 0 };
static bool  g_has_prev = false;

// 1. فلترة الجتر والاهتزاز الدقيق
static inline float FilterJitter(float delta) {
    if (std::abs(delta) < g_cfg.hardware_jitter) return 0.0f;
    return delta;
}

// 2. تطبيق منحنى القوة الرياضي (Power Curve)
static inline float ApplyMouseCurve(float delta) {
    float filtered = FilterJitter(delta);
    if (std::abs(filtered) < g_cfg.internal_deadzone) return 0.0f;

    float sign = (filtered > 0.0f) ? 1.0f : -1.0f;
    float mag = std::abs(filtered);

    // تطبيق المنحنى على مقدار الدلتا
    float normalized = std::min(1.0f, mag / 127.0f);
    float curved = std::pow(normalized, g_cfg.exponent) * 127.0f * g_cfg.sensitivity_mult;

    return sign * curved;
}

// دالة بث الحركة المعالجة للنظام
static void InjectModifiedMotion(int dx, int dy) {
    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dx = dx;
    input.mi.dy = dy;
    input.mi.dwFlags = MOUSEEVENTF_MOVE;
    input.mi.dwExtraInfo = CUSTOM_INJECTED_TAG;
    SendInput(1, &input, sizeof(INPUT));
}

// Low-Level Hook Callback
LRESULT CALLBACK LowLevelMouseProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode == HC_ACTION && wParam == WM_MOUSEMOVE) {
        MSLLHOOKSTRUCT* pMouse = reinterpret_cast<MSLLHOOKSTRUCT*>(lParam);

        // إذا كانت الحركة مرسلة من برنامجنا، نتركها تمر للنظام فوراً
        if (pMouse->dwExtraInfo == CUSTOM_INJECTED_TAG || (pMouse->flags & LLMHF_INJECTED)) {
            return CallNextHookEx(g_mouse_hook, nCode, wParam, lParam);
        }

        if (!g_has_prev) {
            g_prev_pt = pMouse->pt;
            g_has_prev = true;
            return 1; // حجب الحركة الأولى لحفظ نقطة البداية
        }

        int raw_dx = pMouse->pt.x - g_prev_pt.x;
        int raw_dy = pMouse->pt.y - g_prev_pt.y;
        g_prev_pt = pMouse->pt;

        if (raw_dx == 0 && raw_dy == 0) {
            return 1;
        }

        // تطبيق المنحنى وفلتر الجتر على الإزاحة الفيزيائية
        float curved_x = ApplyMouseCurve(static_cast<float>(raw_dx));
        float curved_y = ApplyMouseCurve(static_cast<float>(raw_dy));

        int final_dx = static_cast<int>(std::round(curved_x));
        int final_dy = static_cast<int>(std::round(curved_y));

        if (final_dx != 0 || final_dy != 0) {
            InjectModifiedMotion(final_dx, final_dy);
        }

        // إرجاع 1 لحجب الحركة الخام الفيزيائية عن النظام واستبدالها بالمعالجة
        return 1;
    }

    return CallNextHookEx(g_mouse_hook, nCode, wParam, lParam);
}

int main() {
    std::cout << "========================================================================\n";
    std::cout << " LowLatencyController: Native C++ Hardware Mouse Interceptor\n";
    std::cout << " Intercepting Physical Mouse Deltas -> Applying Power Curve\n";
    std::cout << " Jitter Filter: " << g_cfg.hardware_jitter << " | Exponent: " << g_cfg.exponent 
              << " | Multiplier: " << g_cfg.sensitivity_mult << "\n";
    std::cout << " Press Ctrl+C in terminal to stop and release mouse hook.\n";
    std::cout << "========================================================================\n";

    g_mouse_hook = SetWindowsHookExA(WH_MOUSE_LL, LowLevelMouseProc, GetModuleHandle(nullptr), 0);
    if (!g_mouse_hook) {
        std::cerr << "[-] Failed to install WH_MOUSE_LL hook! Error: " << GetLastError() << "\n";
        return 1;
    }

    std::cout << "[+] Hardware Hook Active! Move your mouse to feel the custom curve.\n";

    // حلقة رسائل ويندوز لاستقبال أحداث الـ Hook
    MSG msg;
    while (GetMessage(&msg, nullptr, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    UnhookWindowsHookEx(g_mouse_hook);
    return 0;
}
