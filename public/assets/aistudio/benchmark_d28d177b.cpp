#include <iostream>
#include <vector>
#include <cmath>
#include <chrono>
#include <string>
#include <iomanip>

struct ProcessResult {
    float x;
    float y;
    bool active;
};

enum class CurveType {
    Linear,
    Power,
    Smoothstep,
    Accelerate
};

inline float curve_linear(float val) {
    return std::max(-1.0f, std::min(1.0f, val));
}

inline float curve_power(float val, float exponent = 2.0f) {
    float sign = (val >= 0.0f) ? 1.0f : -1.0f;
    return sign * std::pow(std::abs(val), exponent);
}

inline float curve_smoothstep(float val) {
    float sign = (val >= 0.0f) ? 1.0f : -1.0f;
    float x = std::min(1.0f, std::abs(val));
    return sign * (x * x * (3.0f - 2.0f * x));
}

inline float curve_accelerate(float val, float threshold = 0.85f, float multiplier = 1.4f) {
    float sign = (val >= 0.0f) ? 1.0f : -1.0f;
    float abs_v = std::abs(val);
    if (abs_v <= threshold) return val;
    float excess = (abs_v - threshold) / (1.0f - threshold);
    float boost = abs_v + (excess * (multiplier - 1.0f) * (1.0f - threshold));
    return sign * std::min(1.0f, boost);
}

// دالة المعالجة المباشرة مع منع التخلص منها أثناء التحسين (Inlining Safe)
__attribute__((noinline)) 
ProcessResult process_input(float axis_x, float axis_y, CurveType ctype, float deadzone = 0.05f) {
    float magnitude = std::sqrt(axis_x * axis_x + axis_y * axis_y);
    if (magnitude < deadzone) {
        return { 0.0f, 0.0f, false };
    }

    float norm_x = axis_x / magnitude;
    float norm_y = axis_y / magnitude;
    float raw_magnitude = std::min(1.0f, (magnitude - deadzone) / (1.0f - deadzone));

    float curved_magnitude = raw_magnitude;
    switch (ctype) {
        case CurveType::Power:
            curved_magnitude = curve_power(raw_magnitude, 2.0f);
            break;
        case CurveType::Smoothstep:
            curved_magnitude = curve_smoothstep(raw_magnitude);
            break;
        case CurveType::Accelerate:
            curved_magnitude = curve_accelerate(raw_magnitude, 0.85f, 1.4f);
            break;
        default:
            curved_magnitude = curve_linear(raw_magnitude);
            break;
    }

    return { norm_x * curved_magnitude, norm_y * curved_magnitude, true };
}

int main() {
    const int ITERATIONS = 1000000;
    const float test_x = 0.55f;
    const float test_y = 0.35f;

    struct BenchmarkCase {
        std::string name;
        CurveType type;
    };

    std::vector<BenchmarkCase> cases = {
        { "linear",     CurveType::Linear },
        { "power",      CurveType::Power },
        { "smoothstep", CurveType::Smoothstep },
        { "accelerate", CurveType::Accelerate }
    };

    std::cout << "========================================================================\n";
    std::cout << " Native C++ Benchmark: 1,000,000 iterations (High-Res Steady Clock)\n";
    std::cout << "========================================================================\n";

    for (const auto& bc : cases) {
        // Warmup
        for (int i = 0; i < 10000; ++i) {
            volatile auto r = process_input(test_x, test_y, bc.type);
            (void)r;
        }

        auto start = std::chrono::steady_clock::now();
        for (int i = 0; i < ITERATIONS; ++i) {
            volatile auto r = process_input(test_x, test_y, bc.type);
            (void)r;
        }
        auto end = std::chrono::steady_clock::now();

        std::chrono::duration<double> elapsed = end - start;
        double total_sec = elapsed.count();
        double avg_micros = (total_sec * 1e6) / ITERATIONS;
        double avg_nanos = avg_micros * 1000.0;
        double ops_per_sec = ITERATIONS / total_sec;

        std::cout << " [" << std::left << std::setw(10) << bc.name << "] "
                  << "Total: " << std::fixed << std::setprecision(4) << total_sec << " s | "
                  << "Avg: " << std::setprecision(4) << avg_micros << " us (" 
                  << std::setprecision(1) << avg_nanos << " ns) | "
                  << "Ops/sec: " << std::setprecision(0) << ops_per_sec << "\n";
    }
    std::cout << "========================================================================\n";
    return 0;
}
