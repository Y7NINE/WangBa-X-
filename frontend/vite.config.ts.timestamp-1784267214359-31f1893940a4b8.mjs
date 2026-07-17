// vite.config.ts
import { defineConfig } from "file:///D:/%E7%BD%91%E5%90%A7%E8%AE%A1%E8%B4%B9%E7%B3%BB%E7%BB%9F/frontend/node_modules/.pnpm/vite@4.4.4_@types+node@20.19.43_sass@1.101.0/node_modules/vite/dist/node/index.js";
import vue from "file:///D:/%E7%BD%91%E5%90%A7%E8%AE%A1%E8%B4%B9%E7%B3%BB%E7%BB%9F/frontend/node_modules/.pnpm/@vitejs+plugin-vue@4.2.3_vi_75172ac95753a5bc81d50f461dff8715/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import AutoImport from "file:///D:/%E7%BD%91%E5%90%A7%E8%AE%A1%E8%B4%B9%E7%B3%BB%E7%BB%9F/frontend/node_modules/.pnpm/unplugin-auto-import@0.16.6_406d01b7c3cec88d2249396f79ee7c7e/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///D:/%E7%BD%91%E5%90%A7%E8%AE%A1%E8%B4%B9%E7%B3%BB%E7%BB%9F/frontend/node_modules/.pnpm/unplugin-vue-components@0.2_2dd6ac6fb42f13b6110b212ef1dec407/node_modules/unplugin-vue-components/dist/vite.mjs";
import { ElementPlusResolver } from "file:///D:/%E7%BD%91%E5%90%A7%E8%AE%A1%E8%B4%B9%E7%B3%BB%E7%BB%9F/frontend/node_modules/.pnpm/unplugin-vue-components@0.2_2dd6ac6fb42f13b6110b212ef1dec407/node_modules/unplugin-vue-components/dist/resolvers.mjs";
import { resolve } from "path";
var __vite_injected_original_dirname = "D:\\\u7F51\u5427\u8BA1\u8D39\u7CFB\u7EDF\\frontend";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ["vue", "vue-router", "pinia"],
      dts: "src/auto-imports.d.ts"
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: "src/components.d.ts"
    })
  ],
  resolve: {
    alias: {
      "@": resolve(__vite_injected_original_dirname, "src")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      },
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxcdTdGNTFcdTU0MjdcdThCQTFcdThEMzlcdTdDRkJcdTdFREZcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXFx1N0Y1MVx1NTQyN1x1OEJBMVx1OEQzOVx1N0NGQlx1N0VERlxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovJUU3JUJEJTkxJUU1JTkwJUE3JUU4JUFFJUExJUU4JUI0JUI5JUU3JUIzJUJCJUU3JUJCJTlGL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xuaW1wb3J0IEF1dG9JbXBvcnQgZnJvbSAndW5wbHVnaW4tYXV0by1pbXBvcnQvdml0ZSdcbmltcG9ydCBDb21wb25lbnRzIGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGUnXG5pbXBvcnQgeyBFbGVtZW50UGx1c1Jlc29sdmVyIH0gZnJvbSAndW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvcmVzb2x2ZXJzJ1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICB2dWUoKSxcbiAgICBBdXRvSW1wb3J0KHtcbiAgICAgIHJlc29sdmVyczogW0VsZW1lbnRQbHVzUmVzb2x2ZXIoKV0sXG4gICAgICBpbXBvcnRzOiBbJ3Z1ZScsICd2dWUtcm91dGVyJywgJ3BpbmlhJ10sXG4gICAgICBkdHM6ICdzcmMvYXV0by1pbXBvcnRzLmQudHMnLFxuICAgIH0pLFxuICAgIENvbXBvbmVudHMoe1xuICAgICAgcmVzb2x2ZXJzOiBbRWxlbWVudFBsdXNSZXNvbHZlcigpXSxcbiAgICAgIGR0czogJ3NyYy9jb21wb25lbnRzLmQudHMnLFxuICAgIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICB9LFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpLywgJycpLFxuICAgICAgfSxcbiAgICAgICcvc29ja2V0LmlvJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuICAgICAgICB3czogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThSLFNBQVMsb0JBQW9CO0FBQzNULE9BQU8sU0FBUztBQUNoQixPQUFPLGdCQUFnQjtBQUN2QixPQUFPLGdCQUFnQjtBQUN2QixTQUFTLDJCQUEyQjtBQUNwQyxTQUFTLGVBQWU7QUFMeEIsSUFBTSxtQ0FBbUM7QUFPekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osV0FBVztBQUFBLE1BQ1QsV0FBVyxDQUFDLG9CQUFvQixDQUFDO0FBQUEsTUFDakMsU0FBUyxDQUFDLE9BQU8sY0FBYyxPQUFPO0FBQUEsTUFDdEMsS0FBSztBQUFBLElBQ1AsQ0FBQztBQUFBLElBQ0QsV0FBVztBQUFBLE1BQ1QsV0FBVyxDQUFDLG9CQUFvQixDQUFDO0FBQUEsTUFDakMsS0FBSztBQUFBLElBQ1AsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssUUFBUSxrQ0FBVyxLQUFLO0FBQUEsSUFDL0I7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUMsU0FBUyxLQUFLLFFBQVEsVUFBVSxFQUFFO0FBQUEsTUFDOUM7QUFBQSxNQUNBLGNBQWM7QUFBQSxRQUNaLFFBQVE7QUFBQSxRQUNSLElBQUk7QUFBQSxNQUNOO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
