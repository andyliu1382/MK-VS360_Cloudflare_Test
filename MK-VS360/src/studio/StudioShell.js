export class StudioShell {
  constructor({ projectId, guest = false }) {
    this.projectId = projectId;
    this.guest = guest;
  }

  render() {
    const iframe = document.createElement('iframe');
    iframe.className = 'studio-frame';
    iframe.title = 'MK-VS360 Studio';
    const params = new URLSearchParams({
      embedded: '1',
      projectId: this.projectId,
      guest: this.guest ? '1' : '0'
    });
    iframe.src = `/index_cloud_hq.html?${params.toString()}`;
    return iframe;
  }
}
