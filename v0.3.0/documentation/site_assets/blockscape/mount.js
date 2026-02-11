const Blockscape = window.Blockscape?.default || window.Blockscape;

if (!Blockscape) {
  console.error("Blockscape: bundle not loaded");
  return;
}

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
    props: { seed },
  });
});
