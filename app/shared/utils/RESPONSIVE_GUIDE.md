# Responsive Sizing Guide

## Vấn đề
Trên Android màn hình độ phân giải thấp (HD), giao diện hiển thị quá lớn mặc dù đã set `allowFontScaling = false`. Điều này xảy ra vì React Native sử dụng density-independent pixels (dp) nhưng không tự động điều chỉnh theo kích thước màn hình thực tế.

## Giải pháp
Sử dụng hệ thống responsive scaling tự động giảm kích thước 10-15% cho Android HD screens.

## Cách sử dụng

### Cách 1: Sử dụng responsiveStyleSheet (Khuyến nghị)
Tự động scale tất cả các giá trị số trong styles:

```typescript
import { responsiveStyleSheet } from '../shared/utils/responsiveStyleSheet';

const styles = responsiveStyleSheet.create({
  container: {
    fontSize: 14,        // Tự động scale
    padding: 16,         // Tự động scale
    marginTop: 20,       // Tự động scale
    borderRadius: 8,     // Tự động scale
    borderWidth: 1,      // Tự động scale (ít hơn)
    width: 100,          // Tự động scale
    height: 44,          // Tự động scale
  }
});
```

### Cách 2: Sử dụng scale functions manually
Khi cần scale từng giá trị cụ thể:

```typescript
import { scale, verticalScale, moderateScale } from '../shared/utils/responsive';

const styles = StyleSheet.create({
  text: {
    fontSize: scale(14),           // Scale theo width
    marginTop: verticalScale(20),  // Scale theo height
    padding: moderateScale(16),    // Scale vừa phải
  }
});
```

### Các hàm scale:
- `scale(size)`: Scale theo chiều rộng màn hình (dùng cho fontSize, width, paddingHorizontal, marginHorizontal)
- `verticalScale(size)`: Scale theo chiều cao màn hình (dùng cho paddingVertical, marginVertical, height)
- `moderateScale(size, factor?)`: Scale vừa phải (dùng cho padding, margin, borderRadius)

### Ví dụ áp dụng vào ElementDropdown

**Trước:**
```typescript
const styles = StyleSheet.create({
  itemText: { fontSize: 14, lineHeight: 10 },
  itemContainer: { paddingVertical: 0, minHeight: 20 },
});
```

**Sau:**
```typescript
import { responsiveStyleSheet } from '../shared/utils/responsiveStyleSheet';

const styles = responsiveStyleSheet.create({
  itemText: { fontSize: 14, lineHeight: 10 },
  itemContainer: { paddingVertical: 0, minHeight: 20 },
});
```

## Lưu ý
- iOS không bị ảnh hưởng (chỉ scale trên Android HD screens)
- Giảm 15% cho màn hình ≤ 480px width (HD)
- Giảm 10% cho màn hình ≤ 720px width (HD+)
- Base width: 360px (có thể điều chỉnh trong `responsive.ts`)

