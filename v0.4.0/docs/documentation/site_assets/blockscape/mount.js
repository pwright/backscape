(function mountBlockscape() {
  if (window.__blockscapeMounted) return;

  const Blockscape = window.Blockscape?.default || window.Blockscape;
  if (!Blockscape) {
    console.error("Blockscape: bundle not loaded");
    return;
  }

  const scriptSrc =
    document.currentScript?.src ||
    document.querySelector('script[src*="blockscape/mount.js"]')?.src;
  let initialSettingsUrl = "settings.json";
  if (scriptSrc) {
    try {
      const parsed = new URL(scriptSrc);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const baseParts = parts.length >= 3 ? parts.slice(0, -3) : [];
      const basePath = "/" + baseParts.join("/");
      initialSettingsUrl = new URL(
        "settings.json",
        `${parsed.origin}${basePath ? `${basePath}/` : "/"}`
      ).toString();
    } catch (error) {
      console.warn("Blockscape: unable to resolve settings.json path", error);
    }
  }

  window.__blockscapeMounted = true;

  document.querySelectorAll(".blockscape-root").forEach((root) => {
    const script = root.querySelector('script[type="application/json"]');

    if (!script) {
      console.error("Blockscape: no seed found", root);
      return;
    }

    let seed;
    try {
      seed = JSON.parse(script.textContent);
    } catch (e) {
      console.error("Blockscape: invalid JSON", e);
      return;
    }

    new Blockscape({
      target: root,
      props: {
        seed,
        features: {
          localBackend: false,
          fileOpen: false,
          fileSave: false,
          autoLoadFromDir: false,
          showHeader: false,
          showSidebar: false,
          showFooter: false,
          showModelMeta: false,
          seriesNavMinVersions: 2,
          initialSettingsUrl,
        },
      },
    });
  });
})();
