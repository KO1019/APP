const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * 允许Android应用使用HTTP明文流量
 * 用于连接后端服务器（http://59.110.39.235:9091）
 */
module.exports = function withAndroidCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;

    // 找到application节点
    if (androidManifest.manifest.application) {
      const app = androidManifest.manifest.application;

      // 确保application的$属性存在
      if (!app.$) {
        app.$ = {};
      }

      // 允许明文流量（HTTP）
      app.$['android:usesCleartextTraffic'] = 'true';
    }

    return config;
  });
};
