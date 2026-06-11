export function assertUploadAllowed({ sizeBytes }) {
  const maxBytes = 100 * 1024 * 1024;
  if (Number(sizeBytes || 0) > maxBytes) throw new Error('File exceeds the 100 MB upload limit.');
}
