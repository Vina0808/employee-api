// Middleware xử lý lỗi chung
const handleError = (err, req, res, next) => {
  console.error(err.stack); // In log lỗi ra console

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Lỗi máy chủ nội bộ';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

module.exports = handleError;
