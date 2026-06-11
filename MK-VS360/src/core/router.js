function compilePath(path) {
  const keys = [];
  const pattern = path
    .replace(/\/+$/, '')
    .replace(/:([^/]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
  return {
    keys,
    regex: new RegExp(`^${pattern || '/'}$`)
  };
}

export function createRouter({ root, routes, fallback = '/login' }) {
  const prepared = routes.map(route => ({ ...route, ...compilePath(route.path) }));

  function match(pathname) {
    const cleanPath = pathname.replace(/\/+$/, '') || '/';
    for (const route of prepared) {
      const matched = cleanPath.match(route.regex);
      if (matched) {
        const params = Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(matched[index + 1])]));
        return { route, params };
      }
    }
    return null;
  }

  function navigate(path) {
    history.pushState({}, '', path);
    render();
  }

  async function render() {
    const current = match(location.pathname);
    if (!current) {
      navigate(fallback);
      return;
    }

    const { route, params } = current;
    if (route.redirect) {
      navigate(route.redirect());
      return;
    }
    if (route.guard && !route.guard(params)) {
      navigate(fallback);
      return;
    }

    root.innerHTML = '';
    const context = { params, navigate };
    const node = await route.view(context);
    root.appendChild(node);
  }

  function start() {
    document.addEventListener('click', event => {
      const link = event.target.closest('a[data-link]');
      if (!link) return;
      event.preventDefault();
      navigate(link.getAttribute('href'));
    });
    window.addEventListener('popstate', render);
    render();
  }

  return { start, render, navigate };
}
