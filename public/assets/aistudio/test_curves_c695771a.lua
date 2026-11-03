package.path = "./src/lua/?.lua;./src/lua/?/init.lua;" .. package.path
local curves = require("curves")

print("================================================================")
print(" Input Value | Linear    | Power (2.0) | Smoothstep | Accelerate")
print("================================================================")

local test_inputs = { 0.10, 0.25, 0.50, 0.75, 0.85, 0.95, 1.00 }

for _, v in ipairs(test_inputs) do
    local lin   = curves.linear(v)
    local pwr   = curves.power(v, 2.0)
    local smt   = curves.smoothstep(v)
    local acc   = curves.accelerate(v, 0.85, 1.4)
    print(string.format("    %4.2f     |  %6.4f  |   %6.4f    |   %6.4f   |   %6.4f", v, lin, pwr, smt, acc))
end
print("================================================================")
