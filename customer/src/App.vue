<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  min-height: 100vh;
  color: #333;
}

.app-container {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: #fff;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.08);
}
</style>
