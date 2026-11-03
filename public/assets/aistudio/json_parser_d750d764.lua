local json = {}

-- تفكيك خفيف وسريع لأرقام وسلاسل JSON البسيطة بدون تبعيات خارجية
function json.decode(str)
    local obj = {}
    for k, v in string.gmatch(str, '"([%w_]+)"%s*:%s*([%w_%.-]+)') do
        local num = tonumber(v)
        if num ~= nil then
            obj[k] = num
        elseif v == "true" then
            obj[k] = true
        elseif v == "false" then
            obj[k] = false
        else
            obj[k] = v:gsub('^"', ''):gsub('"$', '')
        end
    end
    -- التقاط السلاسل النصية المحاطة بعلامات تنصيص
    for k, v in string.gmatch(str, '"([%w_]+)"%s*:%s*"([^"]+)"') do
        obj[k] = v
    end
    return obj
end

function json.encode_pretty(tbl)
    local lines = { "{" }
    local items = {}
    for k, v in pairs(tbl) do
        if type(v) == "string" then
            table.insert(items, string.format('  "%s": "%s"', k, v))
        elseif type(v) == "number" then
            table.insert(items, string.format('  "%s": %.4f', k, v))
        elseif type(v) == "boolean" then
            table.insert(items, string.format('  "%s": %s', k, tostring(v)))
        end
    end
    table.sort(items)
    for i, line in ipairs(items) do
        local comma = (i < #items) and "," or ""
        table.insert(lines, line .. comma)
    end
    table.insert(lines, "}")
    return table.concat(lines, "\n")
end

return json
