# AI Guide for vfcomr Project

## 1. TỔNG QUAN PROJECT
- **Mục đích**: Ứng dụng quản lý thông tin thăm viếng và sự kiện cho các nhà thờ.
- **Tech Stack**:
  - Ngôn ngữ: TypeScript, JavaScript
  - Framework: React Native
  - API: Kết nối với backend API (được định nghĩa trong `app/config/api.ts`)
  - State Management: Context API
  - UI: @ui-kitten/components

## 2. CẤU TRÚC THƯ MỤC
```
app/
├── assets/              # Tài nguyên (icons, images)
├── config/              # Cấu hình ứng dụng (API, navigation, ngôn ngữ)
├── hooks/               # Custom hooks
├── modules/             # Các module chức năng (auth, visits, dashboard...)
├── shared/              # Components, styles, utilities dùng chung
├── __tests__/           # Unit tests
android/                 # Native code Android
ios/                     # Native code iOS
```

**Thư mục bỏ qua**: `node_modules/`, `android/build/`, `ios/build/`, `.git/`

## 3. CÁC MODULE / FILE CỐT LÕI
| File | Chức năng | Phụ thuộc |
|------|-----------|-----------|
| `App.tsx` | Entry point chính | `app/config/navigation.tsx` |
| `app/config/api.ts` | Cấu hình API endpoints | - |
| `app/config/navigation.tsx` | Định nghĩa navigation flow | Các screen trong `app/modules/` |
| `app/shared/styles/global.ts` | Global styles/theming | @ui-kitten/components |

## 4. QUY TẮC CODE
- **Đặt tên**:
  - Component: PascalCase (ví dụ: `AddVisitsScreen.tsx`)
  - Hook: `useSomething.ts`
  - Style: Đặt trong object `styles` với StyleSheet
- **API Calls**:
  - Luôn sử dụng API service được định nghĩa trong `app/config/api.ts`
  - Xử lý lỗi: Hiển thị Alert hoặc message từ backend
- **Cấm**:
  - Không hardcode API URLs
  - Không sửa trực tiếp file native code trừ khi có hướng dẫn

## 5. BIẾN MÔI TRƯỜNG / CONFIG
| Biến | Mục đích |
|------|----------|
| `API_BASE_URL` | Base URL cho backend API |
| `GOOGLE_MAPS_API_KEY` | Key cho Google Maps (nếu có) |

## 6. WORKFLOW THƯỜNG GẶP
### Thêm màn hình mới
1. Tạo file trong `app/modules/[tên-module]/screens/`
2. Đăng ký navigation trong `app/config/navigation.tsx`
3. Áp dụng global styles từ `app/shared/styles/global.ts`

### Gọi API
1. Sử dụng API service từ `app/config/api.ts`
2. Xử lý response/error trong component

## 7. LƯU Ý TỐI ƯU TOKEN
- Khi sửa visits/events: Chỉ cần đọc `app/modules/visits/` và `app/config/api.ts`
- Khi sửa UI: Tập trung vào `app/shared/styles/` và component liên quan
- Không cần đọc lại toàn bộ repo trừ khi thay đổi kiến trúc lớn