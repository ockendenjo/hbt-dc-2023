// vite.config.js
export default {
    // config options
    server: {
        proxy: {
            "/aggregate.json": {
                target: "https://dc.hbt.ockenden.io",
                changeOrigin: true,
            },
        },
    },
};
