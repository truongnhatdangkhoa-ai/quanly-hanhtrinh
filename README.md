# Hành Trình

App Android quản lý hành trình, chi phí và thời gian đi du lịch. Xem `CLAUDE.md` để biết lộ trình.

## Đưa lên GitHub lần đầu
1. Tạo repo mới trên GitHub (để trống, không thêm README).
2. Giải nén zip, đẩy TOÀN BỘ nội dung lên repo (nhánh nào cũng được), nhớ có thư mục ẩn `.github` và thư mục `keystore`.
3. Vào **Settings > Actions > General > Workflow permissions**, chọn **Read and write permissions**, bấm Save.
4. Push xong GitHub tự build (khoảng 5 đến 8 phút). Vào mục **Releases** để tải `HanhTrinh.apk`.

## Cập nhật
Chỉ cần đẩy file mới lên (commit/push), GitHub tự build và đăng bản mới lên Releases. Không cần bấm gì ở tab Actions.

Từ bản 1.0.5, nếu chỉ sửa giao diện/logic thì KHÔNG cần cài lại APK: mở app (cần có mạng), app tự tải giao diện mới, bấm "Cập nhật ngay" hoặc mở lại app lần nữa. Chỉ cài lại APK khi đổi icon, quyền hoặc plugin native (bản 1.0.6 thêm plugin sao lưu nên cần cài lại APK một lần). Repo cần để chế độ Public.

## Cài lên điện thoại
Tải `HanhTrinh.apk`, mở file, cho phép cài từ nguồn không xác định nếu máy hỏi. Bản mới cài đè lên bản cũ, dữ liệu được giữ nguyên.

## Chạy thử trên máy tính
```
npm install
npm run dev
```
