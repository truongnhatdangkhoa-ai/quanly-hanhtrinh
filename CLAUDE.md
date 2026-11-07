# Hành Trình – app quản lý du lịch (Android)

App cho cá nhân/gia đình: lịch trình theo ngày, chi phí chuyến đi, đếm ngược thời gian.
Chạy offline, dữ liệu lưu ngay trên máy. Không có chia tiền nhóm.

## Công nghệ
- React 18 + TypeScript + Vite
- Capacitor 6 đóng gói ra Android (thư mục `android/` KHÔNG nằm trong repo, CI tự tạo bằng `npx cap add android`)
- Lưu dữ liệu: localStorage (khóa `hanh-trinh-data-v1`), đủ cho Bản 1. Sao lưu/khôi phục ra file JSON qua `@capacitor/filesystem` + `@capacitor/share` (xem `src/backup.ts`). Bản 3 sẽ cân nhắc chuyển SQLite/IndexedDB khi có ảnh
- Giao diện tiếng Việt, tông xanh đậm (#12303b) + vàng nắng (#f2b33d), dùng font hệ thống (chạy offline). Có chế độ tối tự theo máy; màu/bo góc/đổ bóng nằm ở biến CSS `:root` đầu `styles.css`
- Bản đồ: Leaflet 1.9 + ô bản đồ OpenStreetMap (cần mạng để tải ô bản đồ; phần còn lại của app vẫn offline). Tìm địa điểm và đổi tọa độ thành tên qua Nominatim (OSM), không cần khóa API
- Tiền: luôn hiển thị dạng `100.000 VNĐ`, dùng `money()` và `groupDigits()` trong `src/utils.ts`; lưu dạng số nguyên

## Cấu trúc
- `src/App.tsx` danh sách chuyến đi, điều hướng, nút Back Android (history.pushState)
- `src/Itinerary.tsx` lịch trình theo ngày, điểm dừng, tick "đã đến", mở Google Maps
- `src/Expenses.tsx` khoản chi theo danh mục, thanh ngân sách
- `src/Summary.tsx` đếm ngược, thống kê, chi theo danh mục
- `src/TripForm.tsx`, `src/Modal.tsx` form dùng chung
- `src/storage.ts` hook `useData` đọc/ghi localStorage
- `src/backup.ts` tạo/đọc/kiểm tra file sao lưu JSON, gộp/thay thế dữ liệu, xuất file (ghi vào Cache rồi mở bảng chia sẻ; trên trình duyệt thì tải xuống). `src/Backup.tsx` là bottom sheet Sao lưu và khôi phục, mở bằng nút lưu trữ ở góc trên phải màn hình chính
- `src/geo.ts` Nominatim: `searchPlaces` (chỉ tìm khi bấm tìm), `reversePlace` (tọa độ -> tên), xếp hàng cách nhau ~1,1 giây đúng quy định Nominatim; `hasPin`, `coordsText`, `directionsUrl`
- `src/mapKit.ts` `createMap` (nền OSM, nút zoom góc dưới phải, tự `invalidateSize` khi khung đổi kích thước) và `pinIcon` (ghim giọt nước vẽ bằng CSS, không dùng ảnh nên không dính lỗi icon mặc định của Leaflet)
- `src/MapPicker.tsx` màn hình toàn màn hình chọn địa điểm: tìm theo tên, chạm bản đồ để ghim, kéo ghim, nút "Vị trí của tôi", tự điền tên + địa chỉ. Render qua `createPortal` ra `body` (bottom sheet có transform sẽ làm lệch `position: fixed`). Hook `useBackClose` thêm 1 mục lịch sử để nút Back Android chỉ đóng bản đồ
- `src/route.ts` đường đi và gợi ý thứ tự: `roadRoute` (đường bộ thật qua OSRM), `optimizeRoute` (OSRM `trip`, điểm đầu cố định; offline hoặc lỗi thì tự tính theo đường chim bay bằng gần nhất + 2-opt), `applyOrder` (áp thứ tự mới), `fmtKm`/`fmtMin`
- `src/TripMap.tsx` tab "Bản đồ" của chuyến: ghim đánh số theo giờ trong ngày, màu theo ngày (`--day-0..5`), lọc theo ngày, đường nét đứt nối thẳng (không phải đường đi thực), danh sách điểm chưa ghim để ghim nhanh
- `src/useDragSort.ts` hook kéo thả đổi thứ tự bằng pointer events (không dùng thư viện): tay cầm `.grip` bên phải thẻ điểm dừng (`touch-action: none`), listener gắn vào `window` (vì React có thể chuyển node DOM giữa chừng làm mất pointer capture), tự cuộn khi kéo sát mép, phím mũi tên lên/xuống cũng đổi chỗ được. Khi thả, `Itinerary.reorder` dùng `applyOrder` nên khung giờ cũ được gán lại theo thứ tự mới (giống "Sắp xếp tuyến")
- `src/notify.ts` thông báo nhắc bằng `@capacitor/local-notifications` (chỉ chạy trên APK). `syncReminders(data)` huỷ hết thông báo đang chờ rồi đặt lại toàn bộ nhắc còn ở tương lai (tối đa 60 cái gần nhất), gọi từ `App.tsx` mỗi khi dữ liệu đổi và khi quay lại app. Nhắc điểm dừng: `Stop.remind` (số phút trước giờ, 0 = đúng giờ, cần điểm có giờ, bỏ qua điểm đã tick "đã đến"). Nhắc khởi hành: `Trip.remindDeparture` (20:00 tối hôm trước + 07:00 sáng ngày đi). Check-in/check-out chỉ là điểm dừng có nhắc (form có nút chọn nhanh tên). `src/Reminder.tsx` (`NotifyHint`) xin quyền khi bật nhắc, bị từ chối thì hiện nút mở cài đặt
- `src/offlineMap.ts` bộ nhớ offline cho bản đồ bằng IndexedDB (`hanh-trinh-offline`): `CachedTileLayer` (ô có trong máy dùng ngay, chưa có thì tải qua `<img crossOrigin>` rồi vẽ vào canvas lưu lại; KHÔNG dùng fetch vì `CapacitorHttp` can thiệp fetch; tối đa 3000 ô, xóa ô cũ nhất), `planTiles`/`prefetchTiles` (nút "Lưu bản đồ offline" ở tab Bản đồ, tối đa 400 ô mỗi lần, 3 luồng) và cache đường đi OSRM (60 mục) để offline vẫn xem được quãng đường đã tính trước đó
- `src/types.ts` kiểu dữ liệu + danh sách danh mục chi
- `src/MoneyInput.tsx` ô nhập tiền: gõ 100000 tự hiện 100.000, đơn vị VNĐ nằm trong ô
- `src/Icon.tsx` bộ icon SVG (thay emoji), `CatBadge` + màu từng danh mục chi (`CAT_COLOR`)
- `src/Logo.tsx` logo (ghim địa điểm + đường đi chấm), dùng ở đầu trang danh sách
- `tools/make-icons.py` tạo icon/splash (cần Pillow). Chạy lại khi đổi thiết kế logo; kết quả nằm ở `android-res/` và `assets/`
- `android-res/` icon launcher các mật độ màn hình, CI chép đè vào `android/app/src/main/res/`
- `assets/` icon-512.png và splash.png (màn hình chờ)
- `keystore/debug.keystore` khóa ký cố định (để cài đè bản mới lên bản cũ). Chỉ là khóa debug, không phải khóa phát hành Google Play

## Bản đồ và vị trí
- `Stop` có thêm `lat?`/`lng?` (cùng có hoặc cùng không có); điểm cũ chưa có tọa độ vẫn dùng bình thường (nút chỉ đường tìm theo tên như trước). Có tọa độ thì nút chỉ đường mở Google Maps tới đúng tọa độ. `backup.ts` giữ và kiểm tra tọa độ khi sao lưu/khôi phục
- Form điểm dừng: nút "Chọn trên bản đồ" đứng trên ô tên. Chọn xong tên được điền sẵn (sửa tay được). Nếu người dùng đã tự gõ tên khác thì chọn lại vị trí không ghi đè tên
- `App.tsx` bỏ qua `popstate` khi `history.state.trip` còn: mục lịch sử của bản đồ mang state này, nhờ vậy Back chỉ đóng bản đồ. Đừng đổi thành `setOpenId(null)` vô điều kiện
- Nút "Vị trí của tôi" dùng `getMyPosition()` trong `src/location.ts` (plugin `@capacitor/geolocation`, tự hiện hộp thoại xin quyền; trình duyệt dùng `navigator.geolocation`). Bị từ chối quyền hoặc GPS tắt thì hiện nút "Mở cài đặt..." (`openLocationSettings`, plugin `capacitor-native-settings`) và tự thử lại khi người dùng quay về app. Cũ: workflow chèn quyền `ACCESS_COARSE/FINE_LOCATION` vào AndroidManifest nên PHẢI cài lại APK một lần (không cập nhật qua mạng được). Không có quyền thì hiện thông báo, các cách chọn khác vẫn dùng được
- Quy định dịch vụ miễn phí: ô bản đồ OSM và Nominatim chỉ hợp cho app cá nhân dùng ít. Nếu sau này nhiều người dùng, đổi nhà cung cấp ô bản đồ (MapTiler, Stadia...) ở `mapKit.ts` và dịch vụ tìm kiếm ở `geo.ts`
- Tuyến đường: chọn một ngày ở tab Bản đồ thì hiện quãng đường và thời gian lái xe (OSRM, chỉ tính ô tô, thời gian chỉ là ước tính) và vẽ đường bộ thật. Nút "Sắp xếp tuyến" (từ 3 điểm đã ghim trở lên) gợi ý thứ tự ngắn nhất, cho XEM TRƯỚC trên bản đồ rồi mới "Áp dụng". Điểm đầu của ngày giữ nguyên làm nơi xuất phát; điểm chưa ghim không tham gia. Khi áp dụng, các khung giờ cũ được gán lại theo thứ tự mới (điểm thứ i nhận giờ thứ i, điểm không có giờ vẫn không có giờ)
- Gợi ý tuyến CHỈ tối ưu quãng đường: chưa tính giờ mở cửa, giờ ăn, giờ ngủ trưa của bé. OSRM bản công cộng chỉ nên dùng cho app cá nhân (tối đa 12 điểm/lần gợi ý, 25 điểm/lần vẽ đường); nhiều người dùng thì tự dựng máy chủ OSRM hoặc đổi nhà cung cấp ở `route.ts`
- Chế độ tối: ô bản đồ đảo màu bằng CSS filter ở `.leaflet-tile-pane`; ghim, bong bóng thông tin dùng biến CSS như phần còn lại

## Offline và nhắc nhở
- Dùng ô OSM: chỉ lưu ô người dùng đã xem và vùng quanh các điểm khi bấm "Lưu bản đồ offline" (giới hạn 400 ô/lần) để đúng quy định sử dụng ô miễn phí của OSM (không tải hàng loạt). Nếu cần lưu vùng lớn hơn thì đổi sang nhà cung cấp cho phép (MapTiler, Stadia...) ở `offlineMap.ts` + `mapKit.ts`
- Mất mạng: tab Bản đồ hiện thông báo offline, quãng đường tự chuyển sang đường chim bay (hoặc dùng đường thật đã lưu nếu trước đó có tính cho đúng chuỗi điểm này)
- Thông báo cần quyền `POST_NOTIFICATIONS` (Android 13+), `USE_EXACT_ALARM`, `SCHEDULE_EXACT_ALARM`: workflow chèn vào AndroidManifest. Plugin tự đăng ký lại báo thức sau khi khởi động lại máy. Một số hãng máy (Xiaomi, Oppo...) có thể chặn báo thức nền: người dùng cần cho app chạy nền/tự khởi động
- Kéo thả đổi thứ tự dựa trên khung giờ: điểm không có giờ nằm cuối ngày, kéo lên trên thì nhận khung giờ của vị trí đó và điểm bị đẩy xuống mất giờ (cùng quy ước với "Sắp xếp tuyến")

## Quy ước giao diện (UI/UX)
- Màu, bo góc, đổ bóng, chiều cao tab: chỉ dùng biến CSS ở `:root` đầu `src/styles.css` (có sẵn bản tối trong `@media (prefers-color-scheme: dark)`). Không viết mã màu cứng trong component, trừ màu danh mục chi ở `CAT_COLOR` (`src/Icon.tsx`)
- Icon: dùng `<Icon name="..." />` trong `src/Icon.tsx` (SVG nét đơn 24x24). Không dùng emoji làm icon. Thêm icon mới = thêm một mục vào `PATHS`
- Thêm danh mục chi mới: thêm vào `CATEGORIES` (`types.ts`), thêm icon cùng `key` vào `PATHS` và màu vào `CAT_COLOR`
- Vùng chạm tối thiểu 40px (nút icon) và 50px (nút chính, ô nhập). Nút hành động chính: nền vàng (`.fab`) hoặc xanh đậm (`.primary`)
- Form luôn mở bằng `Modal` (bottom sheet); nút xóa là `.danger` có icon thùng rác, nút lưu là `.primary` bên phải
- Màn hình trống dùng khối `.empty-state` (icon + tiêu đề + một câu hướng dẫn), không để trang trắng
- Tiền hiển thị lớn: số và chữ `VNĐ` nhỏ cạnh nhau (xem `.budget-amount`); số liệu dùng `font-variant-numeric: tabular-nums`
- Tôn trọng vùng an toàn của máy (`--safe-top`, `--safe-bottom`) và `prefers-reduced-motion`
- Sau khi sửa giao diện: kiểm tra cả chế độ sáng và tối, màn hình hẹp 360px, và chữ tiếng Việt dài không bị tràn

## Build và phát hành APK (tự động)
- File `.github/workflows/build-apk.yml` tự chạy mỗi khi push lên bất kỳ nhánh nào (trừ khi chỉ sửa file `.md`). Lưu ý: file workflow phải có trong chính nhánh được push
- Kết quả: APK nằm ở mục **Releases** của repo, tên `HanhTrinh.apk`
- Link tải bản mới nhất: `https://github.com/<tài khoản>/<repo>/releases/latest/download/HanhTrinh.apk`
- `versionCode` = số lần chạy workflow (`github.run_number`), nên bản sau luôn lớn hơn bản trước
- Đổi số phiên bản hiển thị: sửa `version` trong `package.json`. App tự hiện `v<version> · build <số>` ở góc dưới trái màn hình chính (`vite.config.ts` nhúng `__APP_VERSION__` và `__APP_BUILD__`; CI truyền `BUILD_NUMBER` ở bước Build web). Chạy `npm run dev` trên máy thì không có số build

## Tự cập nhật giao diện (không cần cài lại APK)
- Dùng plugin `@capgo/capacitor-updater` (chế độ thủ công, `autoUpdate: false` trong `capacitor.config.ts`). Logic ở `src/updater.ts`
- Mỗi lần CI chạy, Releases có 3 file: `HanhTrinh.apk`, `bundle.zip` (thư mục `dist`, tức giao diện) và `update.json` (`version`, `build`, `bundle`, `url`)
- App mở lên (và mỗi khi quay lại app, cách nhau tối thiểu 10 phút) đọc `https://github.com/<repo>/releases/latest/download/update.json`. Nếu `build` lớn hơn `__APP_BUILD__` đang chạy thì tải `bundle.zip`, dùng ở lần mở sau; hiện thông báo "Cập nhật ngay" để dùng liền
- Chạm vào dòng phiên bản ở góc dưới trái để kiểm tra lại; dòng đó cũng báo trạng thái (đã mới nhất / đang tải / sẵn sàng / lỗi)
- `markAppReady()` ở `main.tsx` phải luôn được gọi khi app khởi động: nếu giao diện mới bị lỗi, plugin tự quay về bản trước
- Repo phải ở chế độ Public (app đọc Releases không cần đăng nhập). `fetch` đi qua `CapacitorHttp` để khỏi bị chặn CORS
- CHỈ cập nhật được phần giao diện/logic web. Đổi icon, màn hình chờ, quyền Android, thêm plugin native hoặc nâng Capacitor vẫn phải cài lại APK (APK mới tự reset về giao diện nhúng sẵn, nên không bị lẫn bản cũ)
- Plugin cập nhật cần compileSdk 35: workflow tự nâng `compileSdkVersion` lên 35, `minSdkVersion` lên 23 (Android 6.0 trở lên, do thư viện Google Play services đi kèm plugin) và Android Gradle Plugin lên 8.7.2 / Gradle 8.9 sau khi `cap add android` (targetSdk giữ 34). Nếu build lỗi liên quan SDK/AGP thì xem bước "Nâng compileSdk" trong workflow
- Lần đầu dùng cơ chế này phải cài APK của bản 1.0.5 trở lên; các bản trước đó không có cơ chế này

## Quy ước làm việc
- Mỗi khi hoàn thành một bản: tăng `version` (số này hiện trong app nên luôn phải tăng để nhìn thấy đã cập nhật) trong `package.json`, tick `[x]` trong lộ trình dưới đây, thêm dòng vào "Nhật ký các bản"
- Khi xong các sửa đổi, gửi 2 file zip: (1) chỉ gồm các file đã sửa/thêm (giữ nguyên đường dẫn thư mục) để cập nhật GitHub; (2) bản FULL hoàn chỉnh để lưu trữ
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
- [x] Thông báo nhắc: giờ xuất phát, check-in/check-out (trước 1 ngày, 1 giờ) (1.0.10)
- [ ] Checklist hành lý có mẫu sẵn (biển, núi, nước ngoài), tick từng món
- [ ] Checklist riêng cho từng thành viên gia đình (đồ của bé, thuốc men, giấy tờ)
- [x] Kéo thả đổi thứ tự điểm dừng (1.0.10)
- [ ] Gắn nhãn "ai chi" cho khoản chi (không chia nợ)

### Bản 3 (1.2.x) – giấy tờ và kỷ niệm
- [ ] Lưu giấy tờ: vé, mã đặt phòng, ảnh CCCD/hộ chiếu, khóa vân tay/PIN
- [ ] Nhật ký ảnh và ghi chú theo ngày
- [ ] Xuất PDF lịch trình, gửi qua Zalo
- [ ] Chi phí xe riêng: km, xăng, phí cầu đường, tổng nhanh
- [ ] Đánh dấu điểm dừng "có chỗ nghỉ/nhà vệ sinh", giờ ngủ trưa của bé

### Bản 4 (1.3.x) – hoàn thiện
- [x] Sao lưu/khôi phục ra file JSON (1.0.6; chia sẻ được sang Drive/Zalo qua bảng chia sẻ của Android)
- [ ] Sao lưu tự động lên Google Drive
- [x] Bản đồ dùng được khi mất sóng: lưu ô bản đồ và đường đi vào máy (1.0.10)
- [ ] Biểu đồ tròn/cột
- [ ] Dự báo thời tiết tại điểm đến
- [x] Bản đồ trong app: chọn địa điểm trên bản đồ khi thêm điểm dừng, tab Bản đồ xem toàn bộ chuyến (1.0.7)
- [x] Gợi ý và xem trước tuyến đường theo ngày, quãng đường/thời gian lái xe (1.0.8)
- [ ] Tuyến có giờ mở cửa, giờ ăn, giờ ngủ trưa của bé; chọn điểm cuối cố định; đi bộ/xe máy
- [ ] Wishlist địa điểm muốn đi (dùng lại `MapPicker`)
- [ ] Nhiều loại tiền (nếu đi nước ngoài)

## Nhật ký các bản
- 1.0.10: Ba tính năng. (1) Kéo thả đổi thứ tự điểm dừng bằng tay cầm bên phải thẻ (giờ gán lại theo thứ tự mới). (2) Thông báo nhắc: mỗi điểm dừng có giờ chọn được nhắc đúng giờ / trước 15 phút / 1 giờ / 1 ngày; chuyến đi có nhắc ngày khởi hành; form điểm dừng có nút chọn nhanh Check-in/Check-out khách sạn; xin quyền thông báo và gợi ý mở cài đặt nếu bị từ chối. (3) Bản đồ offline: ô bản đồ đã xem tự lưu vào máy, nút "Lưu bản đồ offline" tải sẵn khu vực quanh các điểm, đường đi đã tính được lưu lại, hiện thông báo khi offline và quãng đường chim bay thay thế. Thêm plugin native `@capacitor/local-notifications` và quyền thông báo nên PHẢI cài lại APK một lần. Dữ liệu cũ vẫn dùng bình thường (thêm hai trường tùy chọn `remind`, `remindDeparture`, sao lưu JSON giữ cả hai). Chưa chạy thử trên máy thật (môi trường soạn không có mạng để cài thư viện và build).
- 1.0.9: Gợi ý mở cài đặt khi thiếu quyền vị trí: nút "Vị trí của tôi" tự xin quyền, nếu bị từ chối hoặc GPS tắt thì hiện nút mở thẳng trang cài đặt của app / cài đặt GPS, quay lại app thì tự thử lại. Thêm plugin native `@capacitor/geolocation` và `capacitor-native-settings` nên PHẢI cài lại APK một lần. Chưa chạy thử trên máy thật (môi trường soạn không có mạng để cài thư viện và build).
- 1.0.8: Liên kết hành trình bằng bản đồ. Tab Bản đồ: chọn một ngày để xem quãng đường và thời gian lái xe, vẽ đường bộ thật nối các điểm. Nút "Sắp xếp tuyến" gợi ý thứ tự đi ngắn nhất (điểm đầu giữ nguyên), xem trước trên bản đồ rồi Áp dụng (giờ được gán lại theo thứ tự mới). Offline thì tự tính theo đường chim bay. Chỉ đổi giao diện/logic nên cập nhật qua mạng được, không cần cài lại APK. Chưa chạy thử trên máy thật.
- 1.0.7: Bản đồ. Thêm/sửa điểm dừng có nút "Chọn trên bản đồ": tìm theo tên hoặc chạm/kéo ghim, tự điền tên và địa chỉ, có nút "Vị trí của tôi". Thêm tab "Bản đồ" ở màn hình chuyến đi: ghim đánh số theo giờ, màu theo ngày, lọc theo ngày, chạm ghim để xem và chỉ đường, danh sách điểm chưa ghim để ghim nhanh. Điểm đã ghim có biểu tượng ghim trong lịch trình và nút chỉ đường dùng đúng tọa độ. Thêm thư viện `leaflet`. Giao diện/logic cập nhật qua mạng được; riêng nút "Vị trí của tôi" cần cài lại APK một lần (thêm quyền vị trí). Chưa chạy thử trên máy thật (môi trường soạn không có mạng để cài thư viện và build).
- 1.0.6: Sao lưu và khôi phục: nút lưu trữ ở góc trên phải màn hình chính. Xuất toàn bộ dữ liệu ra file `hanh-trinh-sao-luu-<ngày>_<giờ>.json` (mở bảng chia sẻ để lưu/gửi); nhập lại từ file với hai chế độ Gộp (theo id) hoặc Thay thế toàn bộ, có kiểm tra và làm sạch file trước khi nhập. Thêm plugin native `@capacitor/filesystem` và `@capacitor/share` nên PHẢI cài lại APK một lần; trên bản APK cũ (cập nhật giao diện qua mạng) nút xuất file báo lỗi và có nút "Sao chép nội dung" dự phòng, còn nhập file vẫn dùng được.
- 1.0.5: Tự cập nhật giao diện qua GitHub Releases (bundle.zip + update.json), không cần cài lại APK cho các thay đổi giao diện/logic. Dòng phiên bản báo trạng thái cập nhật, có thông báo "Cập nhật ngay".
- 1.0.4: Hiện số phiên bản mờ ở góc dưới trái màn hình chính (dạng `v1.0.4 · build 12`, build = số lần chạy workflow, khớp tên bản trên Releases) để biết đã cập nhật chưa.
- 1.0.3: Thiết kế lại giao diện: màn hình chính có thẻ chuyến nổi bật + thẻ chuyến có trạng thái, tab dưới có icon, lịch trình dạng timeline, chi phí gom theo ngày, tổng kết có biểu đồ vành khuyên, form dạng bottom sheet, chế độ tối. Không đổi dữ liệu/chức năng.
- 1.0.2: Sửa workflow để tự build ở mọi nhánh (trước đó chỉ main/master nên nhánh khác không tự chạy).
- 1.0.1: Tiền đơn vị VNĐ, ô nhập tự thêm dấu chấm ngăn cách hàng nghìn (gõ 100000 hiện 100.000 VNĐ). Thêm icon, logo, màn hình chờ riêng (thay logo mặc định của Capacitor).
- 1.0.0: Bản 1. Chuyến đi, lịch trình theo ngày, chi phí theo danh mục, ngân sách, tổng kết, CI tự build APK. Chưa chạy thử trên máy thật tại thời điểm viết (môi trường soạn không có mạng để build).
