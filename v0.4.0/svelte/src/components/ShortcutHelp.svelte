<script>
  import { DOCS_BASE } from '../urlBase';
</script>

<div
  id="shortcutHelp"
  class="shortcut-help"
  hidden
  aria-hidden="true"
  role="dialog"
  aria-modal="true"
  aria-labelledby="shortcutHelpTitle"
>
  <div id="shortcutHelpBackdrop" class="shortcut-help__backdrop"></div>
  <div class="shortcut-help__panel" tabindex="-1">
    <div class="shortcut-help__header">
      <div class="shortcut-help__title">
        <h2 id="shortcutHelpTitle">Help</h2>
      </div>
      <button id="shortcutHelpClose" class="shortcut-help__close" type="button" aria-label="Close keyboard shortcuts">&times;</button>
    </div>
    <section class="shortcut-help__section">
      
      <ul class="shortcut-help__tips">
        <li>Play around with the example maps.</li>
        <li>Watch the <a href="https://youtube.com/playlist?list=PLZIp4-s83kaPj5m9VcGXTBhjaquc9fT15&si=aaeXo5ga0D7Vb5LN">videos</a></li>
        <li>Open the <a href={DOCS_BASE}>documentation</a>.</li>
        <li>Read about <a href="https://www.wardleymaps.com" target="_blank" rel="noreferrer noopener">Wardley Maps</a>.</li>
        <li>Copy this URL and use &quot;Load URL&quot;: <a href="https://gist.githubusercontent.com/pwright/86dbb074b35d6d17671bf17ecbf1a824/raw/git.bs" target="_blank" rel="noreferrer noopener">https://gist.githubusercontent.com/pwright/86dbb074b35d6d17671bf17ecbf1a824/raw/git.bs</a></li>
        <li>Edit maps by moving items with Shift + Arrow keys.</li>
      </ul>
    </section>
    <section class="shortcut-help__section">
      <h3 class="shortcut-help__section-title">Keyboard shortcuts</h3>
      <div id="shortcutHelpList" class="shortcut-help__list" aria-live="polite"></div>
    </section>
  </div>
</div>
