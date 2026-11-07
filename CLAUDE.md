# Hành Trình – app quản lý du lịch (Android)

App cho cá nhân/gia đình: lịch trình theo ngày, chi phí chuyến đi, đếm ngược thời gian.
Chạy offline, dữ liệu lưu ngay trên máy. Không có chia tiền nhóm.

## Công nghệ
- React 18 + TypeScript + Vite
- Capacitor 6 đóng gói ra Android (thư mục `android/` KHÔNG nằm trong repo, CI tự tạo bằng `npx cap add android`)
- Lưu dữ liệu: localStorage (khóa `hanh-trinh-data-v1`), đủ cho Bản 1. Bản 3 sẽ cân nhắc chuyển SQLite/IndexedDB khi có ảnh
- Giao diện tiếng Việt, tông xanh đậm (#12303b) + vàng nắng (#f2b33d), dùng font hệ thống (chạy offline)
- Tiền: luôn hiển thị dạng `100.000 VNĐ`, dùng `money()` và `groupDigits()` trong `src/utils.ts`; lưu dạng số nguyên

## Cấu trúc
- `src/App.tsx` danh sách chuyến đi, điều hướng, nút Back Android (history.pushState)
- `src/Itinerary.tsx` lịch trình theo ngày, điểm dừng, tick "đã đến", mở Google Maps
- `src/Expenses.tsx` khoản chi theo danh mục, thanh ngân sách
- `src/Summary.tsx` đếm ngược, thống kê, chi theo danh mục
- `src/TripForm.tsx`, `src/Modal.tsx` form dùng chung
- `src/storage.ts` hook `useData` đọc/ghi localStorage
- `src/types.ts` kiểu dữ liệu + danh sách danh mục chi
- `src/MoneyInput.tsx` ô nhập tiền: gõ 100000 tự hiện 100.000, đơn vị VNĐ nằm trong ô
- `src/Logo.tsx` logo (ghim địa điểm + đường đi chấm), dùng ở đầu trang danh sách
- `tools/make-icons.py` tạo icon/splash (cần Pillow). Chạy lại khi đổi thiết kế logo; kết quả nằm ở `android-res/` và `assets/`
- `android-res/` icon launcher các mật độ màn hình, CI chép đè vào `android/app/src/main/res/`
- `assets/` icon-512.png và splash.png (màn hình chờ)
- `keystore/debug.keystore` khóa ký cố định (để cài đè bản mới lên bản cũ). Chỉ là khóa debug, không phải khóa phát hành Google Play

## Build và phát hành APK (tự động)
- File `.github/workflows/build-apk.yml` tự chạy mỗi khi push lên `main`/`master` (trừ khi chỉ sửa file `.md`)
- Kết quả: APK nằm ở mục **Releases** của repo, tên `HanhTrinh.apk`
- Link tải bản mới nhất: `https://github.com/<tài khoản>/<repo>/releases/latest/download/HanhTrinh.apk`
- `versionCode` = số lần chạy workflow (`github.run_number`), nên bản sau luôn lớn hơn bản trước
- Đổi số phiên bản hiển thị: sửa `version` trong `package.json`

## Quy ước làm việc
- Mỗi khi hoàn thành một bản: tăng `version` trong `package.json`, tick `[x]` trong lộ trình dưới đây, thêm dòng vào "Nhật ký các bản"
- Giữ CLAUDE.md này cập nhật; sửa file `.md` không kích hoạt build lại
- Không thêm thư viện nặng nếu chưa cần (app chạy offline, APK nhỏ)

## Lộ trình
### Bản 1 (1.0.x) – nền tảng
- [x] Tạo/sửa/xóa chuyến đi (tên, điểm đến, ngày đi/về, ngân sách)
- [x] Lịch trình theo ngày: điểm dừng có giờ, ghi chú, tick "đã đến"
- [x] Mở Google Maps từ từng điểm dừng
- [x] Chi phí theo danh mục (xe, phòng, ăn uống, vé, xăng/cầu đường, mua sắm, khác)
- [x] Thanh ngân sách dự kiến so với thực tế, báo vượt
- [x] Tổng kết: đếm ngược, chi theo danh mục, chi trung bình mỗi ngày
- [x] Tự build APK lên GitHub Releases khi có file mới

### Bản 2 (1.1.x) – thời gian và chuẩn bị
- [ ] Thông báo nhắc: giờ xuất phát, check-in/check-out (trước 1 ngày, 1 giờ)
- [ ] Checklist hành lý có mẫu sẵn (biển, núi, nước ngoài), tick từng món
- [ ] Checklist riêng cho từng thành viên gia đình (đồ của bé, thuốc men, giấy tờ)
- [ ] Kéo thả đổi thứ tự điểm dừng
- [ ] Gắn nhãn "ai chi" cho khoản chi (không chia nợ)

### Bản 3 (1.2.x) – giấy tờ và kỷ niệm
- [ ] Lưu giấy tờ: vé, mã đặt phòng, ảnh CCCD/hộ chiếu, khóa vân tay/PIN
- [ ] Nhật ký ảnh và ghi chú theo ngày
- [ ] Xuất PDF lịch trình, gửi qua Zalo
- [ ] Chi phí xe riêng: km, xăng, phí cầu đường, tổng nhanh
- [ ] Đánh dấu điểm dừng "có chỗ nghỉ/nhà vệ sinh", giờ ngủ trưa của bé

### Bản 4 (1.3.x) – hoàn thiện
- [ ] Sao lưu/khôi phục ra file hoặc Google Drive
- [ ] Biểu đồ tròn/cột
- [ ] Dự báo thời tiết tại điểm đến
- [ ] Wishlist địa điểm muốn đi
- [ ] Nhiều loại tiền (nếu đi nước ngoài)

## Nhật ký các bản
- 1.0.1: Tiền đơn vị VNĐ, ô nhập tự thêm dấu chấm ngăn cách hàng nghìn (gõ 100000 hiện 100.000 VNĐ). Thêm icon, logo, màn hình chờ riêng (thay logo mặc định của Capacitor).
- 1.0.0: Bản 1. Chuyến đi, lịch trình theo ngày, chi phí theo danh mục, ngân sách, tổng kết, CI tự build APK. Chưa chạy thử trên máy thật tại thời điểm viết (môi trường soạn không có mạng để build).
