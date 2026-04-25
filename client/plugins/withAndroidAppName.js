const { withAndroidManifest, withStringsXml } = require('@expo/config-plugins');

/**
 * 设置Android应用显示名称（中文）
 */
module.exports = function withAndroidAppName(config) {
  // 设置AndroidManifest.xml中的应用名称
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;

    // 找到application节点
    if (androidManifest.manifest.application) {
      const app = androidManifest.manifest.application;

      // 确保application的$属性存在
      if (!app.$) {
        app.$ = {};
      }

      // 设置应用名称
      app.$['android:label'] = 'AI情绪日记';
    }

    return config;
  });

  // 设置strings.xml中的app_name
  config = withStringsXml(config, (config) => {
    const stringsXml = config.modResults;

    // 添加或更新app_name字符串资源
    const appNameString = stringsXml.resources.string?.find((s) => s.$.name === 'app_name');
    if (appNameString) {
      appNameString._ = 'AI情绪日记';
    } else {
      if (!stringsXml.resources.string) {
        stringsXml.resources.string = [];
      }
      stringsXml.resources.string.push({
        $: { name: 'app_name' },
        _: 'AI情绪日记',
      });
    }

    return config;
  });

  return config;
};
