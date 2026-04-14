const utf8ToBase64 = (str: string): string => {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

export const buildScopedUrl = (
  baseUrl: string,
  projectPath: string | null
): string => {
  if (!projectPath) return baseUrl;
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}project=${encodeURIComponent(utf8ToBase64(projectPath))}`;
};

export const getProjectDisplayName = (
  projectPath: string | null
): string | null => {
  if (!projectPath) return null;
  const segments = projectPath.replace(/[/\\]+$/, "").split(/[/\\]/);
  return segments[segments.length - 1] || projectPath;
};
