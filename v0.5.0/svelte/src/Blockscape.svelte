<script>
  import './app.css';
  import App from './App.svelte';

  export let seed;
  export let features = {};
</script>

<div class="blockscape-app-root">
  <App {seed} {features} />
</div>
