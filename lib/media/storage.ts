import path from "node:path";

const DEFAULT_STORAGE_ROOT = "../uploads";
const DEFAULT_PUBLIC_PATH = "/uploads";

function normalizePublicPath(value: string) {
  const trimmedValue = value.trim() || DEFAULT_PUBLIC_PATH;
  const withLeadingSlash = trimmedValue.startsWith("/")
    ? trimmedValue
    : `/${trimmedValue}`;

  return withLeadingSlash.replace(/\/+$/, "") || DEFAULT_PUBLIC_PATH;
}

function getStorageRoot() {
  return path.resolve(
    process.env.REAL_ESTATE_UPLOADS_PATH ??
      process.env.MEDIA_STORAGE_PATH ??
      DEFAULT_STORAGE_ROOT
  );
}

export function getMediaPublicBasePath() {
  return normalizePublicPath(
    process.env.REAL_ESTATE_UPLOADS_PUBLIC_PATH ??
      process.env.MEDIA_PUBLIC_PATH ??
      DEFAULT_PUBLIC_PATH
  );
}

export function resolveMediaStoragePath(...segments: string[]) {
  return path.resolve(getStorageRoot(), ...segments);
}

export function getMediaPublicUrl(...segments: string[]) {
  const normalizedSegments = segments
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);

  return [getMediaPublicBasePath(), ...normalizedSegments].join("/");
}

export function getMediaFilePathFromUrl(fileUrl: string) {
  const publicBasePath = getMediaPublicBasePath();
  let pathname: string;

  try {
    pathname = new URL(fileUrl, "http://local.invalid").pathname;
  } catch {
    return null;
  }

  if (pathname !== publicBasePath && !pathname.startsWith(`${publicBasePath}/`)) {
    return null;
  }

  const relativePath = decodeURIComponent(pathname.slice(publicBasePath.length))
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean);

  if (relativePath.length === 0) {
    return null;
  }

  const resolvedPath = resolveMediaStoragePath(...relativePath);
  const storageRoot = getStorageRoot();
  const relativeToStorageRoot = path.relative(storageRoot, resolvedPath);

  return relativeToStorageRoot && !relativeToStorageRoot.startsWith("..")
    ? resolvedPath
    : null;
}
