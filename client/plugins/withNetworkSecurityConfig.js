const fs = require('fs');
const path = require('path');

/**
 * 创建网络安全配置文件
 * 允许Android应用使用HTTP明文流量
 */
module.exports = function withNetworkSecurityConfig(config) {
  const configPlugin = (config) => {
    // 这里只是占位，实际的网络配置会通过其他插件处理
    return config;
  };

  return withDangerousMod(config, [
    'ios',
    'android',
  ], (config) => {
    const { platform, projectRoot } = config.modRequest;

    if (platform === 'android') {
      // 创建网络安全配置文件的路径
      const resXmlPath = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'res',
        'xml'
      );

      // 确保目录存在
      if (!fs.existsSync(resXmlPath)) {
        fs.mkdirSync(resXmlPath, { recursive: true });
      }

      // 创建网络安全配置文件内容
      const networkSecurityConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

      // 写入文件
      const configPath = path.join(resXmlPath, 'network_security_config.xml');
      fs.writeFileSync(configPath, networkSecurityConfig);
    }

    return config;
  });
};

// 临时使用，实际应该使用expo/config-plugins
function withDangerousMod(config, platforms, action) {
  return config;
}
