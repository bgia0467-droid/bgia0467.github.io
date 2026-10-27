# Đề tài: Xây dựng website bán điện thoại và thiết bị công nghệ

## 1. Lý do chọn đề tài
Điện thoại thông minh và phụ kiện là nhóm sản phẩm có nhu cầu mua sắm cao. Website thương mại điện tử giúp khách hàng tìm kiếm, so sánh sản phẩm và đặt hàng thuận tiện; đồng thời hỗ trợ cửa hàng theo dõi hàng hóa, khách hàng và đơn hàng.

## 2. Mục tiêu
- Xây dựng giao diện bán hàng responsive bằng HTML, CSS và JavaScript.
- Thực hiện các luồng xem sản phẩm, tìm kiếm, lọc danh mục, xem chi tiết, giỏ hàng và thanh toán.
- Tạo trang quản trị mẫu để theo dõi doanh thu, sản phẩm, danh mục, khách hàng và đơn hàng.
- Lưu trạng thái đăng nhập trên trình duyệt và dùng `db.json` làm nơi lưu tài khoản, giỏ hàng và đơn hàng qua JSON Server.

## 3. Đối tượng và phạm vi
Website mô phỏng cửa hàng điện thoại di động, máy tính bảng, đồng hồ thông minh và phụ kiện. Đây là đồ án phục vụ học tập; JSON Server chỉ là API demo, chưa tích hợp cơ sở dữ liệu production, cổng thanh toán hoặc xác thực bảo mật.

## 4. Chức năng chính
- Khách hàng: duyệt/tìm/lọc và phân trang sản phẩm, xem sản phẩm theo danh mục trên trang chủ, xem chi tiết, quản lý giỏ hàng theo tồn kho, nhập thông tin giao hàng và xác nhận đơn.
- Tài khoản demo: đăng ký, đăng nhập, đặt lại mật khẩu bằng email đã đăng ký và đăng xuất. Tài khoản đăng ký được lưu vào `db.json` qua JSON Server. Khi đăng nhập, có thể ghi nhớ tài khoản bằng localStorage hoặc chỉ lưu trong phiên tab bằng sessionStorage; trạng thái đăng nhập chỉ lưu tên và email, không lưu mật khẩu.
- Giỏ hàng của tài khoản được lưu trong `carts`; đơn đặt hàng và danh sách sản phẩm mua được lưu trong `orders` của `db.json`. Khi quản trị cập nhật trạng thái đơn, trạng thái cũng được cập nhật vào `db.json`. Khi đăng nhập, tài khoản, giỏ hàng và đơn hàng cũ tương ứng trong localStorage được chuyển vào database.
- Quản trị: đăng nhập demo, xem tổng quan, thêm/sửa/xóa danh mục và sản phẩm, xem hình ảnh, xem khách hàng và cập nhật trạng thái đơn.
- Ảnh sản phẩm được nhập bằng URL; nếu URL không tải được, giao diện tự hiển thị ảnh dự phòng thay vì ảnh lỗi.
- Ảnh cho các sản phẩm mẫu được lưu cục bộ trong `assets/products` để vẫn hiển thị khi không có kết nối tới dịch vụ ảnh bên ngoài.

## 5. Tài khoản quản trị demo
- Email: `admin@mobi.vn`
- Mật khẩu: `Admin@123`

## 6. Công nghệ và cách chạy
- HTML5, CSS3, JavaScript thuần và JSON Server.
- Chạy JSON Server bằng `npm install` rồi `npm start` trong thư mục `website` (API tại `http://localhost:3000`). Ở terminal khác, chạy `python -m http.server 8000` tại cùng thư mục rồi truy cập `http://localhost:8000`. `db.json` lưu tài khoản, giỏ hàng và đơn hàng; trạng thái đăng nhập vẫn dùng localStorage/sessionStorage.
- Đây là đồ án demo: JSON Server và mật khẩu dạng văn bản không phù hợp để triển khai thực tế.
- Phân trang danh sách sản phẩm hiển thị tối đa 4 sản phẩm mỗi trang; có thể kết hợp tìm kiếm, lọc danh mục và sắp xếp.
- Tài khoản mẫu: `demo@example.com` / `demo123`.

## 7. Hướng phát triển
Tích hợp backend REST API, cơ sở dữ liệu, phân quyền quản trị, quản lý tồn kho thực, tìm kiếm nâng cao, gửi email và cổng thanh toán sandbox.
