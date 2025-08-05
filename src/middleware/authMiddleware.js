const jwt = require('jsonwebtoken');

// ✅ Middleware: Kiểm tra xác thực người dùng qua token
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Chưa xác thực. Vui lòng đăng nhập.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Gắn thông tin user từ token vào request
        console.log('🔑 req.user:', req.user);

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
};

// ✅ Middleware: Chỉ cho phép Admin truy cập
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: 'Không có quyền truy cập. Chỉ Admin được phép.' });
};

// ✅ Middleware: Chỉ cho phép Quản lý đơn vị truy cập
const isManager = (req, res, next) => {
    if (req.user && req.user.role === 'manager') {
        return next();
    }
    return res.status(403).json({ message: 'Không có quyền truy cập. Chỉ Quản lý đơn vị được phép.' });
};

// ✅ Middleware: Chỉ cho phép người dùng xem thông tin của chính họ
const isSelf = (req, res, next) => {
    const requestedMaNv = req.params.ma_nv?.toUpperCase();
    const loggedInMaNv = req.user?.ma_nv?.toUpperCase();

    if (requestedMaNv === loggedInMaNv) {
        return next();
    }

    return res.status(403).json({ message: 'Chỉ được phép truy cập thông tin cá nhân của chính bạn.' });
};

module.exports = {
    authenticate,
    isAdmin,
    isManager,
    isSelf
};
