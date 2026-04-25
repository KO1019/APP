// 应用入口点 - 重定向到启动页
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/splash" />;
}
