// ============================================
// UPLOADS API
// ============================================
// Sends files to /upload/image and /upload/document.
// We use FormData with the file URI from expo-image-picker.

import apiClient from "./client";

// Build a FormData object that React Native's fetch / axios understand
function buildFormData(localUri, fieldName = "file", extra = {}) {
  const form = new FormData();
  // Guess filename + mime type from the URI
  const filename = localUri.split("/").pop() || "upload.jpg";
  const ext = filename.split(".").pop().toLowerCase();
  const mime = (ext === "png") ? "image/png"
             : (ext === "pdf") ? "application/pdf"
             : (ext === "webp") ? "image/webp"
             : "image/jpeg";
  form.append(fieldName, {
    uri: localUri,
    name: filename,
    type: mime,
  });
  for (const [k, v] of Object.entries(extra)) {
    form.append(k, v);
  }
  return form;
}

// Upload a property image. Returns { url, public_id, width, height }
export async function uploadImageApi(localUri) {
  const form = buildFormData(localUri, "file");
  const res = await apiClient.post("/upload/image", form, {
    headers: { "Content-Type": "multipart/form-data" },
    transformRequest: (data) => data,   // axios -> FormData passthrough
  });
  return res.data;
}

// Upload a verification document.
// docType: "national_id" | "ownership_proof" | "agent_license" | "other"
export async function uploadDocumentApi(localUri, docType = "other") {
  const form = buildFormData(localUri, "file", { doc_type: docType });
  const res = await apiClient.post("/upload/document", form, {
    headers: { "Content-Type": "multipart/form-data" },
    transformRequest: (data) => data,
  });
  return res.data;
}
