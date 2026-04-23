import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Platform,
  ViewStyle,
  TextStyle,
  TextInput
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import dayjs from 'dayjs';
import { FontAwesome6 } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

// 暖橙色主题配色
const THEME = {
  background: '#FFF7ED',
  surface: 'rgba(255, 255, 255, 0.95)',
  accent: '#EA580C',
  foreground: '#78350F',
  muted: '#A16207',
  border: '#FDBA74',
};

// --------------------------------------------------------
// 1. 配置 Dayjs
// --------------------------------------------------------
// 即使服务端返回 '2023-10-20T10:00:00Z' (UTC)，
// dayjs(utcString).format() 会自动转为手机当前的本地时区显示。
// 如果需要传回给后端，我们再转回 ISO 格式。

interface SmartDateInputProps {
  label?: string;           // 表单标题 (可选)
  value?: string | null;    // 服务端返回的时间字符串 (ISO 8601, 带 T)
  onChange: (isoDate: string) => void; // 回调给父组件的值，依然是标准 ISO 字符串
  placeholder?: string;
  mode?: 'date' | 'time' | 'datetime'; // 支持日期、时间、或两者
  displayFormat?: string;   // UI展示的格式，默认 YYYY-MM-DD
  error?: string;           // 错误信息

  // 样式自定义（可选）
  containerStyle?: ViewStyle;        // 外层容器样式
  inputStyle?: ViewStyle;            // 输入框样式
  textStyle?: TextStyle;             // 文字样式
  labelStyle?: TextStyle;            // 标签样式
  placeholderTextStyle?: TextStyle;  // 占位符文字样式
  errorTextStyle?: TextStyle;        // 错误信息文字样式
  iconColor?: string;                // 图标颜色
  iconSize?: number;                 // 图标大小
}

export const SmartDateInput = ({
  label,
  value,
  onChange,
  placeholder = '请选择',
  mode = 'date',
  displayFormat,
  error,
  containerStyle,
  inputStyle,
  textStyle,
  labelStyle,
  placeholderTextStyle,
  errorTextStyle,
  iconColor,
  iconSize = 18
}: SmartDateInputProps) => {
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const webInputRef = useRef<HTMLInputElement>(null);

  // 默认展示格式
  const format = displayFormat || (mode === 'time' ? 'HH:mm' : 'YYYY-MM-DD');

  // --------------------------------------------------------
  // 2. 核心：数据转换逻辑
  // --------------------------------------------------------

  // 解析服务端值，确保无效值不传给控件；time 模式兼容仅时间字符串
  const parsedValue = useMemo(() => {
    if (!value) return null;

    const direct = dayjs(value);
    if (direct.isValid()) return direct;

    if (mode === 'time') {
      const timeOnly = dayjs(`1970-01-01T${value}`);
      if (timeOnly.isValid()) return timeOnly;
    }

    return null;
  }, [value, mode]);

  // A. 将字符串转为 JS Date 对象给控件使用
  // 如果 value 是空或无效，回退到当前时间
  const dateObjectForPicker = useMemo(() => {
    return parsedValue ? parsedValue.toDate() : new Date();
  }, [parsedValue]);

  // B. 将 Date 对象转为展示字符串
  const displayString = useMemo(() => {
    if (!parsedValue) return '';
    return parsedValue.format(format);
  }, [parsedValue, format]);

  // --------------------------------------------------------
  // 3. 核心：交互逻辑 (解决键盘遮挡/无法收起)
  // --------------------------------------------------------

  const showDatePicker = () => {
    // 【关键点】打开日期控件前，必须强制收起键盘！
    // 否则键盘会遮挡 iOS 的底部滚轮，或者导致 Android 焦点混乱
    Keyboard.dismiss();
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date: Date) => {
    hideDatePicker();
    // 采用带本地偏移的 ISO 字符串，避免 date 模式在非 UTC 时区出现跨天
    const serverString = dayjs(date).format(format);
    onChange(serverString);
  };

  // Web 端的原生日期输入处理
  const handleWebInputChange = (text: string) => {
    if (text && text.match(/^\d{4}-\d{2}-\d{2}$/)) {
      onChange(text);
    }
  };

  // 根据 mode 选择图标
  const iconName = mode === 'time' ? 'clock' : 'calendar';

  return (
    <View style={[styles.container, containerStyle]}>
      {/* 标题 */}
      {label && <Text style={[styles.label, { color: THEME.foreground }, labelStyle]}>{label}</Text>}

      {Platform.OS === 'web' ? (
        // Web 端：使用可编辑的 TextInput
        <View style={[styles.inputBox, { backgroundColor: THEME.surface }, inputStyle]}>
          <TextInput
            style={[styles.webInput, { color: value ? THEME.foreground : THEME.muted }]}
            placeholder={placeholder}
            placeholderTextColor={THEME.muted}
            value={displayString || ''}
            onChangeText={handleWebInputChange}
            maxLength={10}
          />
          <FontAwesome6
            name={iconName}
            size={iconSize}
            color={iconColor || (value ? THEME.accent : THEME.muted)}
            style={{ marginLeft: 12 }}
          />
        </View>
      ) : (
        // 移动端：使用 react-native-modal-datetime-picker
        <>
          <TouchableOpacity
            style={[
              styles.inputBox,
              { backgroundColor: THEME.surface },
              error ? styles.inputBoxError : null,
              inputStyle
            ]}
            onPress={showDatePicker}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.text,
                { color: value ? THEME.foreground : THEME.muted },
                textStyle,
                !value && styles.placeholder,
                !value && placeholderTextStyle
              ]}
              numberOfLines={1}
            >
              {displayString || placeholder}
            </Text>

            <FontAwesome6
              name={iconName}
              size={iconSize}
              color={iconColor || (value ? THEME.accent : THEME.muted)}
              style={styles.icon}
            />
          </TouchableOpacity>

          {error && <Text style={[styles.errorText, { color: '#EF4444' }, errorTextStyle]}>{error}</Text>}

          {/* 
             DateTimePickerModal 是 React Native Modal。
             它会覆盖在所有 View 之上。
          */}
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode={mode}
            date={dateObjectForPicker} // 传入 Date 对象
            onConfirm={handleConfirm}
            onCancel={hideDatePicker}
            // iOS 只有用这个 display 样式才最稳，避免乱七八糟的 inline 样式
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            // 自动适配系统深色模式
            isDarkModeEnabled={false}
            // 强制使用中文环境
            locale="zh-CN"
            confirmTextIOS="确定"
            cancelTextIOS="取消"
            buttonTextColorIOS={THEME.accent}
          />
        </>
      )}
    </View>
  );
};

// 设计样式
const styles = StyleSheet.create({
  container: {
    marginBottom: 0, // 移除默认的 marginBottom，由父组件控制
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 2,
  },
  inputBox: {
    height: 52, // 增加高度提升触控体验
    borderRadius: 12, // 更圆润的角
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(253, 186, 116, 0.8)', // 暖橙色边框
    // 增加轻微阴影提升层次感 (iOS)
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    // Android
    elevation: 2,
  },
  inputBoxError: {
    shadowColor: '#EF4444',
  },
  text: {
    fontSize: 16,
    flex: 1,
  },
  webInput: {
    fontSize: 16,
    flex: 1,
    padding: 0,
    backgroundColor: 'transparent',
  },
  placeholder: {
    opacity: 0.7,
  },
  icon: {
    marginLeft: 12,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 2,
    fontSize: 12,
  }
});
