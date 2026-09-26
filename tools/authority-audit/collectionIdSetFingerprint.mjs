import { createHash } from "node:crypto";

export const COLLECTION_ID_SET_FINGERPRINT_VERSION = "MYWEB_COLLECTION_ID_SET_V1";

const DOMAIN_MARKER = Buffer.from(`${COLLECTION_ID_SET_FINGERPRINT_VERSION}\u0000`, "utf8");

export class CollectionIdSetFingerprintError extends Error {
  constructor(code) {
    super(code);
    this.name = "CollectionIdSetFingerprintError";
    this.code = code;
  }
}

function utf8Bytes(id) {
  try {
    const bytes = Buffer.from(id, "utf8");
    if (bytes.toString("utf8") !== id) {
      throw new CollectionIdSetFingerprintError("ENCODING_ERROR");
    }
    return bytes;
  } catch (error) {
    if (error instanceof CollectionIdSetFingerprintError) throw error;
    throw new CollectionIdSetFingerprintError("ENCODING_ERROR");
  }
}

function validateCollectionIds(collectionIds) {
  if (!Array.isArray(collectionIds)) {
    throw new CollectionIdSetFingerprintError("NON_ARRAY_INPUT");
  }

  const seen = new Set();
  return collectionIds.map((id) => {
    if (typeof id !== "string") {
      throw new CollectionIdSetFingerprintError("NON_STRING_ID");
    }
    if (id.length === 0) {
      throw new CollectionIdSetFingerprintError("EMPTY_ID");
    }
    if (seen.has(id)) {
      throw new CollectionIdSetFingerprintError("DUPLICATE_ID");
    }
    seen.add(id);
    return { bytes: utf8Bytes(id) };
  });
}

function lengthPrefix(bytes) {
  if (bytes.length > 0xffff_ffff) {
    throw new CollectionIdSetFingerprintError("ENCODING_ERROR");
  }
  const prefix = Buffer.allocUnsafe(4);
  prefix.writeUInt32BE(bytes.length, 0);
  return prefix;
}

export function computeCollectionIdSetFingerprintV1(collectionIds) {
  try {
    const entries = validateCollectionIds(collectionIds);
    entries.sort((left, right) => Buffer.compare(left.bytes, right.bytes));
    const payload = [DOMAIN_MARKER];
    for (const entry of entries) {
      payload.push(lengthPrefix(entry.bytes), entry.bytes);
    }
    return Object.freeze({
      version: COLLECTION_ID_SET_FINGERPRINT_VERSION,
      count: entries.length,
      sha256: createHash("sha256").update(Buffer.concat(payload)).digest("hex"),
    });
  } catch (error) {
    if (error instanceof CollectionIdSetFingerprintError) throw error;
    throw new CollectionIdSetFingerprintError("UNEXPECTED_INTERNAL_ERROR");
  }
}
