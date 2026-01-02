# Network Status Banner Setup

Để banner hiển thị trạng thái mạng hoạt động, bạn cần cài đặt và link package `@react-native-community/netinfo`.

## Cài đặt

### 1. Cài đặt package
```bash
npm install @react-native-community/netinfo
```

### 2. iOS Setup
```bash
cd ios
pod install
cd ..
```

### 3. Rebuild App

**iOS:**
```bash
npm run ios
```
Hoặc rebuild trong Xcode

**Android:**
```bash
npm run android
```

## Kiểm tra

Sau khi cài đặt và rebuild:
1. Tắt WiFi/mobile data trên thiết bị
2. Banner màu đỏ sẽ hiển thị ở trên cùng màn hình với text "No internet connection"
3. Bật lại internet, banner sẽ tự động ẩn

## Troubleshooting

Nếu banner không hiển thị:
1. Đảm bảo đã chạy `pod install` cho iOS
2. Đảm bảo đã rebuild app (không chỉ reload)
3. Kiểm tra console logs xem có lỗi gì không
4. Thử xóa `node_modules` và cài lại:
   ```bash
   rm -rf node_modules
   npm install
   cd ios && pod install && cd ..
   ```

