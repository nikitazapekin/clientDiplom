/** Runtime type tags in JSON between ===RESULT=== markers. */

export const JAVA_SERIALIZATION_HELPERS = `
    private static String __codexEscapeJson(String value) {
        StringBuilder escaped = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            switch (ch) {
                case '\\\\':
                    escaped.append("\\\\\\\\");
                    break;
                case '"':
                    escaped.append('\\\\').append('"');
                    break;
                case '\\n':
                    escaped.append("\\\\n");
                    break;
                case '\\r':
                    escaped.append("\\\\r");
                    break;
                case '\\t':
                    escaped.append("\\\\t");
                    break;
                case '\\b':
                    escaped.append("\\\\b");
                    break;
                case '\\f':
                    escaped.append("\\\\f");
                    break;
                default:
                    if (ch < 32) {
                        escaped.append(String.format("\\\\u%04x", (int) ch));
                    } else {
                        escaped.append(ch);
                    }
            }
        }
        return escaped.toString();
    }

    private static String __codexWrap(String type, String valueJson) {
        return "{\\"__codexTyped\\":true,\\"type\\":\\"" + type + "\\",\\"value\\":" + valueJson + "}";
    }

    private static String __codexWrapObject(String className, String valueJson) {
        return "{\\"__codexTyped\\":true,\\"type\\":\\"object\\",\\"className\\":\\"" + __codexEscapeJson(className) + "\\",\\"value\\":" + valueJson + "}";
    }

    private static String __codexSerializeResult(Object value) {
        return __codexSerializeResult(value, new java.util.IdentityHashMap<Object, Boolean>());
    }

    private static String __codexSerializeResult(Object value, java.util.IdentityHashMap<Object, Boolean> visited) {
        if (value == null) {
            return __codexWrap("null", "null");
        }
        if (value instanceof Double) {
            Double number = (Double) value;
            if (!Double.isFinite(number)) {
                return __codexWrap("double", "\\"" + String.valueOf(number) + "\\"");
            }
            return __codexWrap("double", String.valueOf(number));
        }
        if (value instanceof Float) {
            Float number = (Float) value;
            if (!Float.isFinite(number)) {
                return __codexWrap("float", "\\"" + String.valueOf(number) + "\\"");
            }
            return __codexWrap("float", String.valueOf(number));
        }
        if (value instanceof Integer) {
            return __codexWrap("int", String.valueOf(value));
        }
        if (value instanceof Long) {
            return __codexWrap("long", String.valueOf(value));
        }
        if (value instanceof Short) {
            return __codexWrap("short", String.valueOf(value));
        }
        if (value instanceof Byte) {
            return __codexWrap("byte", String.valueOf(value));
        }
        if (value instanceof Boolean) {
            return __codexWrap("boolean", String.valueOf(value));
        }
        if (value instanceof Character) {
            return __codexWrap("char", "\\"" + __codexEscapeJson(String.valueOf(value)) + "\\"");
        }
        if (value instanceof String) {
            return __codexWrap("string", "\\"" + __codexEscapeJson((String) value) + "\\"");
        }
        if (value instanceof Enum<?>) {
            return __codexWrap("string", "\\"" + __codexEscapeJson(String.valueOf(value)) + "\\"");
        }

        Class<?> valueClass = value.getClass();

        if (valueClass.isArray()) {
            int length = java.lang.reflect.Array.getLength(value);
            StringBuilder json = new StringBuilder("[");
            for (int i = 0; i < length; i++) {
                if (i > 0) {
                    json.append(",");
                }
                json.append(__codexSerializeResult(java.lang.reflect.Array.get(value, i), visited));
            }
            json.append("]");
            return __codexWrap("array", json.toString());
        }

        if (value instanceof java.util.List<?>) {
            StringBuilder json = new StringBuilder("[");
            int index = 0;
            for (Object item : (java.util.List<?>) value) {
                if (index > 0) {
                    json.append(",");
                }
                json.append(__codexSerializeResult(item, visited));
                index++;
            }
            json.append("]");
            return __codexWrap("list", json.toString());
        }

        if (value instanceof java.util.Collection<?>) {
            StringBuilder json = new StringBuilder("[");
            int index = 0;
            for (Object item : (java.util.Collection<?>) value) {
                if (index > 0) {
                    json.append(",");
                }
                json.append(__codexSerializeResult(item, visited));
                index++;
            }
            json.append("]");
            return __codexWrap("array", json.toString());
        }

        if (value instanceof java.util.Map<?, ?>) {
            java.util.List<java.util.Map.Entry<?, ?>> entries =
                new java.util.ArrayList<>(((java.util.Map<?, ?>) value).entrySet());
            entries.sort(java.util.Comparator.comparing(entry -> String.valueOf(entry.getKey())));

            StringBuilder json = new StringBuilder("{");
            boolean first = true;
            for (java.util.Map.Entry<?, ?> entry : entries) {
                if (!first) {
                    json.append(",");
                }
                json.append('"')
                    .append(__codexEscapeJson(String.valueOf(entry.getKey())))
                    .append('"')
                    .append(':')
                    .append(__codexSerializeResult(entry.getValue(), visited));
                first = false;
            }
            json.append("}");
            return __codexWrap("map", json.toString());
        }

        if (visited.containsKey(value)) {
            return __codexWrap("string", "\\"[Circular]\\"");
        }

        visited.put(value, Boolean.TRUE);
        try {
            java.util.List<java.lang.reflect.Field> fields = new java.util.ArrayList<>();
            Class<?> current = valueClass;

            while (current != null && current != Object.class) {
                for (java.lang.reflect.Field field : current.getDeclaredFields()) {
                    int modifiers = field.getModifiers();
                    if (!java.lang.reflect.Modifier.isStatic(modifiers) && !field.isSynthetic()) {
                        fields.add(field);
                    }
                }
                current = current.getSuperclass();
            }

            fields.sort(java.util.Comparator.comparing(java.lang.reflect.Field::getName));

            StringBuilder json = new StringBuilder("{");
            boolean first = true;
            for (java.lang.reflect.Field field : fields) {
                if (!first) {
                    json.append(",");
                }
                field.setAccessible(true);
                json.append('"')
                    .append(__codexEscapeJson(field.getName()))
                    .append('"')
                    .append(':')
                    .append(__codexSerializeResult(field.get(value), visited));
                first = false;
            }
            json.append("}");
            return __codexWrapObject(valueClass.getSimpleName(), json.toString());
        } catch (IllegalAccessException error) {
            return __codexWrap("string", "\\"" + __codexEscapeJson(String.valueOf(value)) + "\\"");
        } finally {
            visited.remove(value);
        }
    }

    private static String __codexSerializeError(Exception error) {
        return "{\\"error\\":" + __codexSerializeResult(error.getMessage()) + "}";
    }
`;

export const JS_TYPED_SERIALIZATION_HELPERS = `
function __codexSerializeTyped(value) {
  if (value === null || value === undefined) {
    return { __codexTyped: true, type: "null", value: null };
  }
  if (typeof value === "boolean") {
    return { __codexTyped: true, type: "boolean", value: value };
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return { __codexTyped: true, type: "int", value: value };
    }
    return { __codexTyped: true, type: "double", value: value };
  }
  if (typeof value === "string") {
    return { __codexTyped: true, type: "string", value: value };
  }
  if (typeof value === "bigint") {
    return { __codexTyped: true, type: "long", value: value.toString() };
  }
  if (Array.isArray(value)) {
    return {
      __codexTyped: true,
      type: "array",
      value: value.map(function(item) { return __codexSerializeTyped(item); })
    };
  }
  if (typeof value === "object") {
    var className = value && value.constructor && value.constructor.name !== "Object"
      ? value.constructor.name
      : undefined;
    var fields = {};
    Object.keys(value).forEach(function(key) {
      fields[key] = __codexSerializeTyped(value[key]);
    });
    var envelope = { __codexTyped: true, type: "object", value: fields };
    if (className) {
      envelope.className = className;
    }
    return envelope;
  }
  return { __codexTyped: true, type: "string", value: String(value) };
}
`;

export const PYTHON_TYPED_SERIALIZATION_HELPERS = `
def __codex_serialize_typed(value):
    if value is None:
        return {"__codexTyped": True, "type": "null", "value": None}
    if isinstance(value, bool):
        return {"__codexTyped": True, "type": "boolean", "value": value}
    if isinstance(value, int) and not isinstance(value, bool):
        return {"__codexTyped": True, "type": "int", "value": value}
    if isinstance(value, float):
        return {"__codexTyped": True, "type": "double", "value": value}
    if isinstance(value, str):
        return {"__codexTyped": True, "type": "string", "value": value}
    if isinstance(value, bytes):
        return {"__codexTyped": True, "type": "string", "value": value.decode("utf-8", errors="replace")}
    if isinstance(value, list):
        return {
            "__codexTyped": True,
            "type": "list",
            "value": [__codex_serialize_typed(item) for item in value],
        }
    if isinstance(value, tuple):
        return {
            "__codexTyped": True,
            "type": "array",
            "value": [__codex_serialize_typed(item) for item in value],
        }
    if isinstance(value, dict):
        return {
            "__codexTyped": True,
            "type": "map",
            "value": {str(key): __codex_serialize_typed(val) for key, val in value.items()},
        }
    class_name = value.__class__.__name__
    fields = {}
    for key, val in value.__dict__.items():
        fields[str(key)] = __codex_serialize_typed(val)
    envelope = {"__codexTyped": True, "type": "object", "value": fields}
    if class_name and class_name != "object":
        envelope["className"] = class_name
    return envelope
`;

export const PHP_TYPED_SERIALIZATION_HELPERS = `
function __codex_serialize_typed($value) {
    if ($value === null) {
        return array("__codexTyped" => true, "type" => "null", "value" => null);
    }
    if (is_bool($value)) {
        return array("__codexTyped" => true, "type" => "boolean", "value" => $value);
    }
    if (is_int($value)) {
        return array("__codexTyped" => true, "type" => "int", "value" => $value);
    }
    if (is_float($value)) {
        return array("__codexTyped" => true, "type" => "double", "value" => $value);
    }
    if (is_string($value)) {
        return array("__codexTyped" => true, "type" => "string", "value" => $value);
    }
    if (is_array($value)) {
        $isList = array_keys($value) === range(0, count($value) - 1);
        $serialized = array();
        foreach ($value as $item) {
            $serialized[] = __codex_serialize_typed($item);
        }
        return array(
            "__codexTyped" => true,
            "type" => $isList ? "list" : "map",
            "value" => $isList ? $serialized : array_map("__codex_serialize_typed", $value, array_keys($value)),
        );
    }
    if (is_object($value)) {
        $fields = array();
        foreach (get_object_vars($value) as $key => $item) {
            $fields[$key] = __codex_serialize_typed($item);
        }
        return array(
            "__codexTyped" => true,
            "type" => "object",
            "className" => (new ReflectionClass($value))->getShortName(),
            "value" => $fields,
        );
    }
    return array("__codexTyped" => true, "type" => "string", "value" => strval($value));
}
`;

export const RUBY_TYPED_SERIALIZATION_HELPERS = `
def __codex_serialize_typed(value)
  if value.nil?
    return { __codexTyped: true, type: "null", value: nil }
  end
  if value.is_a?(TrueClass) || value.is_a?(FalseClass)
    return { __codexTyped: true, type: "boolean", value: value }
  end
  if value.is_a?(Integer)
    return { __codexTyped: true, type: "int", value: value }
  end
  if value.is_a?(Float)
    return { __codexTyped: true, type: "double", value: value }
  end
  if value.is_a?(String)
    return { __codexTyped: true, type: "string", value: value }
  end
  if value.is_a?(Array)
    return {
      __codexTyped: true,
      type: "list",
      value: value.map { |item| __codex_serialize_typed(item) },
    }
  end
  if value.is_a?(Hash)
    return {
      __codexTyped: true,
      type: "map",
      value: value.each_with_object({}) { |(key, item), acc| acc[key.to_s] = __codex_serialize_typed(item) },
    }
  end
  if value.is_a?(Object)
    fields = {}
    value.instance_variables.each do |var_name|
      fields[var_name.to_s.delete_prefix("@")] = __codex_serialize_typed(value.instance_variable_get(var_name))
    end
    return {
      __codexTyped: true,
      type: "object",
      className: value.class.name,
      value: fields,
    }
  end
  { __codexTyped: true, type: "string", value: value.to_s }
end
`;

export const GO_TYPED_SERIALIZATION_HELPERS = `
func __codexEscapeJSON(value string) string {
    value = strings.ReplaceAll(value, "\\\\", "\\\\\\\\")
    value = strings.ReplaceAll(value, "\\"", "\\\\\\"")
    value = strings.ReplaceAll(value, "\\n", "\\\\n")
    value = strings.ReplaceAll(value, "\\r", "\\\\r")
    value = strings.ReplaceAll(value, "\\t", "\\\\t")
    return value
}

func __codexWrap(typeName string, valueJSON string) string {
    return fmt.Sprintf("{\\"__codexTyped\\":true,\\"type\\":\\"%s\\",\\"value\\":%s}", typeName, valueJSON)
}

func __codexWrapObject(className string, valueJSON string) string {
    return fmt.Sprintf("{\\"__codexTyped\\":true,\\"type\\":\\"object\\",\\"className\\":\\"%s\\",\\"value\\":%s}", __codexEscapeJSON(className), valueJSON)
}

func __codexSerializeTyped(value interface{}) string {
    if value == nil {
        return __codexWrap("null", "null")
    }

    rv := reflect.ValueOf(value)
    rt := rv.Type()

    switch typed := value.(type) {
    case bool:
        return __codexWrap("boolean", fmt.Sprintf("%t", typed))
    case int:
        return __codexWrap("int", fmt.Sprintf("%d", typed))
    case int8:
        return __codexWrap("byte", fmt.Sprintf("%d", typed))
    case int16:
        return __codexWrap("short", fmt.Sprintf("%d", typed))
    case int32:
        return __codexWrap("int", fmt.Sprintf("%d", typed))
    case int64:
        return __codexWrap("long", fmt.Sprintf("%d", typed))
    case uint, uint8, uint16, uint32, uint64:
        return __codexWrap("int", fmt.Sprintf("%v", typed))
    case float32:
        return __codexWrap("float", fmt.Sprintf("%v", typed))
    case float64:
        return __codexWrap("double", fmt.Sprintf("%v", typed))
    case string:
        return __codexWrap("string", fmt.Sprintf("\\"%s\\"", __codexEscapeJSON(typed)))
    }

    if rt.Kind() == reflect.Slice || rt.Kind() == reflect.Array {
        parts := make([]string, rv.Len())
        for i := 0; i < rv.Len(); i++ {
            parts[i] = __codexSerializeTyped(rv.Index(i).Interface())
        }
        return __codexWrap("array", "["+strings.Join(parts, ",")+"]")
    }

    if rt.Kind() == reflect.Map {
        keys := rv.MapKeys()
        sort.Slice(keys, func(i, j int) bool {
            return fmt.Sprintf("%v", keys[i].Interface()) < fmt.Sprintf("%v", keys[j].Interface())
        })
        parts := make([]string, 0, len(keys))
        for _, key := range keys {
            keyJSON := __codexSerializeTyped(key.Interface())
            valJSON := __codexSerializeTyped(rv.MapIndex(key).Interface())
            parts = append(parts, keyJSON+":"+valJSON)
        }
        return __codexWrap("map", "{"+strings.Join(parts, ",")+"}")
    }

    if rt.Kind() == reflect.Struct {
        parts := make([]string, 0, rt.NumField())
        for i := 0; i < rt.NumField(); i++ {
            field := rt.Field(i)
            if !field.IsExported() {
                continue
            }
            fieldValue := rv.Field(i).Interface()
            keyJSON := __codexWrap("string", fmt.Sprintf("\\"%s\\"", __codexEscapeJSON(field.Name)))
            parts = append(parts, keyJSON+":"+__codexSerializeTyped(fieldValue))
        }
        return __codexWrapObject(rt.Name(), "{"+strings.Join(parts, ",")+"}")
    }

    return __codexWrap("string", fmt.Sprintf("\\"%s\\"", __codexEscapeJSON(fmt.Sprintf("%v", value))))
}
`;

export const CSHARP_TYPED_SERIALIZATION_HELPERS = `
public static class __CodexRuntime {
    private static string __codexEscapeJson(string value) {
        return value
            .Replace("\\\\", "\\\\\\\\")
            .Replace("\\"", "\\\\\\"")
            .Replace("\\n", "\\\\n")
            .Replace("\\r", "\\\\r")
            .Replace("\\t", "\\\\t");
    }

    private static string __codexWrap(string type, string valueJson) {
        return "{\\"__codexTyped\\":true,\\"type\\":\\"" + type + "\\",\\"value\\":" + valueJson + "}";
    }

    private static string __codexWrapObject(string className, string valueJson) {
        return "{\\"__codexTyped\\":true,\\"type\\":\\"object\\",\\"className\\":\\"" + __codexEscapeJson(className) + "\\",\\"value\\":" + valueJson + "}";
    }

    private static string __codexSerializeTyped(object value) {
        if (value == null) {
            return __codexWrap("null", "null");
        }
        if (value is bool boolValue) {
            return __codexWrap("boolean", boolValue ? "true" : "false");
        }
        if (value is double doubleValue) {
            return __codexWrap("double", doubleValue.ToString(System.Globalization.CultureInfo.InvariantCulture));
        }
        if (value is float floatValue) {
            return __codexWrap("float", floatValue.ToString(System.Globalization.CultureInfo.InvariantCulture));
        }
        if (value is decimal decimalValue) {
            return __codexWrap("double", decimalValue.ToString(System.Globalization.CultureInfo.InvariantCulture));
        }
        if (value is int intValue) {
            return __codexWrap("int", intValue.ToString());
        }
        if (value is long longValue) {
            return __codexWrap("long", longValue.ToString());
        }
        if (value is short shortValue) {
            return __codexWrap("short", shortValue.ToString());
        }
        if (value is byte byteValue) {
            return __codexWrap("byte", byteValue.ToString());
        }
        if (value is char charValue) {
            return __codexWrap("char", "\\"" + __codexEscapeJson(charValue.ToString()) + "\\"");
        }
        if (value is string stringValue) {
            return __codexWrap("string", "\\"" + __codexEscapeJson(stringValue) + "\\"");
        }
        if (value is System.Collections.IDictionary dictionary) {
            var parts = new System.Collections.Generic.List<string>();
            foreach (System.Collections.DictionaryEntry entry in dictionary) {
                var keyJson = __codexWrap("string", "\\"" + __codexEscapeJson(System.Convert.ToString(entry.Key)) + "\\"");
                parts.Add(keyJson + ":" + __codexSerializeTyped(entry.Value));
            }
            return __codexWrap("map", "{" + string.Join(",", parts) + "}");
        }
        if (value is System.Collections.IEnumerable enumerable && value is not string) {
            var parts = new System.Collections.Generic.List<string>();
            foreach (var item in enumerable) {
                parts.Add(__codexSerializeTyped(item));
            }
            var collectionType = value is System.Collections.IList ? "list" : "array";
            return __codexWrap(collectionType, "[" + string.Join(",", parts) + "]");
        }

        var fields = value.GetType().GetFields(System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
        var fieldParts = new System.Collections.Generic.List<string>();
        foreach (var field in fields) {
            if (field.IsStatic) {
                continue;
            }
            var keyJson = __codexWrap("string", "\\"" + __codexEscapeJson(field.Name) + "\\"");
            fieldParts.Add(keyJson + ":" + __codexSerializeTyped(field.GetValue(value)));
        }
        return __codexWrapObject(value.GetType().Name, "{" + string.Join(",", fieldParts) + "}");
    }

    public static string SerializeTyped(object value) {
        return __codexSerializeTyped(value);
    }
}
`;

export const RUST_TYPED_SERIALIZATION_HELPERS = `
fn __codex_escape(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
        .replace('\t', "\\t")
}

fn __codex_wrap(type_name: &str, value_json: &str) -> String {
    format!("{{\"__codexTyped\":true,\"type\":\"{}\",\"value\":{}}}", type_name, value_json)
}

fn __codex_wrap_object(class_name: &str, value_json: &str) -> String {
    format!(
        "{{\"__codexTyped\":true,\"type\":\"object\",\"className\":\"{}\",\"value\":{}}}",
        __codex_escape(class_name),
        value_json
    )
}

fn __codex_serialize_typed<T: 'static>(value: &T) -> String {
    use std::any::TypeId;

    macro_rules! codex_if_type {
        ($rust_type:ty, $codex_type:expr, $json:expr) => {
            if TypeId::of::<T>() == TypeId::of::<$rust_type>() {
                let typed = unsafe { &*(value as *const T as *const $rust_type) };
                return __codex_wrap($codex_type, &$json(typed));
            }
        };
    }

    codex_if_type!(bool, "boolean", |v| if *v { "true".to_string() } else { "false".to_string() });
    codex_if_type!(i8, "byte", |v| v.to_string());
    codex_if_type!(i16, "short", |v| v.to_string());
    codex_if_type!(i32, "int", |v| v.to_string());
    codex_if_type!(i64, "long", |v| v.to_string());
    codex_if_type!(u8, "byte", |v| v.to_string());
    codex_if_type!(u16, "short", |v| v.to_string());
    codex_if_type!(u32, "int", |v| v.to_string());
    codex_if_type!(u64, "long", |v| v.to_string());
    codex_if_type!(f32, "float", |v| v.to_string());
    codex_if_type!(f64, "double", |v| v.to_string());
    codex_if_type!(String, "string", |v| format!("\"{}\"", __codex_escape(v)));
    codex_if_type!(Vec<i32>, "array", |v| {
        let parts: Vec<String> = v.iter().map(|item| __codex_serialize_typed(item)).collect();
        format!("[{}]", parts.join(","))
    });
    codex_if_type!(Vec<f64>, "array", |v| {
        let parts: Vec<String> = v.iter().map(|item| __codex_serialize_typed(item)).collect();
        format!("[{}]", parts.join(","))
    });
    codex_if_type!(Vec<String>, "array", |v| {
        let parts: Vec<String> = v.iter().map(|item| __codex_serialize_typed(item)).collect();
        format!("[{}]", parts.join(","))
    });

    let type_name = std::any::type_name::<T>();
    __codex_wrap(
        "string",
        &format!("\"{}\"", __codex_escape(&format!("{:?} ({})", value, type_name))),
    )
}
`;
