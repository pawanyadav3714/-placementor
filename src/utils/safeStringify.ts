/**
 * Safely stringifies an object to JSON, handling circular references and non-serializable types.
 */
export const safeStringify = (obj: any, indent = 2): string => {
  const cache = new Set();
  try {
    const ret = JSON.stringify(
      obj,
      (key, value) => {
        if (value === null) return null;
        if (value === undefined) return undefined;
        if (value instanceof Error) return `${value.name}: ${value.message}`;
        if (typeof value === "function") return "[Function]";
        if (typeof value === "symbol") return value.toString();
        
        if (typeof value === "object" && value !== null) {
          if (cache.has(value)) {
            return "[Circular]";
          }
          cache.add(value);
        }
        return value;
      },
      indent
    );
    cache.clear();
    return ret;
  } catch (err) {
    return String(obj);
  }
};
