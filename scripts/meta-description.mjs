// Match the closing delimiter, not an apostrophe inside a double-quoted value.
export function metaDescription(source) {
  return source.match(/<meta\s+name=["']description["']\s+content=(["'])([\s\S]*?)\1/i)?.[2] || "";
}
