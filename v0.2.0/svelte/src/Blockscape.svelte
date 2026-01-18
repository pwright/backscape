<script>
  import './app.css';
  import App from './App.svelte';

  export let seed;
  export let features = {};
</script>

<App {seed} {features} />
