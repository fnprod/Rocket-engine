package.path = "./src/lua/?.lua;./src/lua/?/init.lua;" .. package.path
local curves = require("curves")

local test_val = 0.5532 -- قيمة كسرية دقيقة لاختبار الـ LERP
local direct_math = curves.power(test_val, 2.0)
local lut_lerp    = curves.power_lut_lerp(test_val)
local error_val   = math.abs(direct_math - lut_lerp)

print("========================================================================")
print(string.format(" [+] Direct Math (x^2) : %.8f", direct_math))
print(string.format(" [+] LUT + LERP Result : %.8f", lut_lerp))
print(string.format(" [+] Absolute Error    : %.10f", error_val))
print("========================================================================")

local ITERATIONS = 1000000
local t1 = os.clock()
for _ = 1, ITERATIONS do curves.power(test_val, 2.0) end
local d_math = os.clock() - t1

local t2 = os.clock()
for _ = 1, ITERATIONS do curves.power_lut_lerp(test_val) end
local d_lut = os.clock() - t2

print(string.format(" [Direct Math] : %6.4f s (Avg: %.2f ns)", d_math, (d_math * 1e9) / ITERATIONS))
print(string.format(" [LUT + LERP ] : %6.4f s (Avg: %.2f ns)", d_lut, (d_lut * 1e9) / ITERATIONS))
print(string.format(" [+] Speedup   : %.1f%% faster", ((d_math - d_lut) / d_math) * 100))
print("========================================================================")
