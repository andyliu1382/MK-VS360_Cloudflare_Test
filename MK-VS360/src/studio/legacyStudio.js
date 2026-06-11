export const legacyStudio = {
  getEmbedUrl(projectId, options = {}) {
    const params = new URLSearchParams({
      embedded: '1',
      projectId,
      guest: options.guest ? '1' : '0'
    });
    return `/index_cloud_hq.html?${params.toString()}`;
  }
};
