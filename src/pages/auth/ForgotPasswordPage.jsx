import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Hotel,
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';

const ADMIN_API_BASE_URL =
  import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:3002/api/admin';
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export default function ForgotPasswordPage() {
  const { currentLoggedInUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [personalEmail, setPersonalEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [submittedResult, setSubmittedResult] = useState(null);

  useEffect(() => {
    if (currentLoggedInUser) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [currentLoggedInUser, navigate]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const timerId = setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timerId);
  }, [cooldownSeconds]);

  const handleEmailChange = (e) => {
    setPersonalEmail(e.target.value);
    if (fieldError) setFieldError('');
    if (generalError) setGeneralError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || cooldownSeconds > 0) return;

    const trimmedEmail = personalEmail.trim();
    if (!trimmedEmail) {
      setFieldError('Vui lòng nhập email cá nhân (Gmail) đã đăng ký');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setFieldError('Định dạng email cá nhân không hợp lệ');
      return;
    }

    setIsSubmitting(true);
    setFieldError('');
    setGeneralError('');

    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ personalEmail: trimmedEmail }),
        credentials: 'include'
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.success) {
        const retryAfter = Number(payload?.data?.retryAfterSeconds || 0);
        if (retryAfter > 0) {
          setCooldownSeconds(retryAfter);
        }
        const serverFieldError = payload?.errors?.personalEmail || '';
        setFieldError(serverFieldError);
        const fallbackMsg = !response.ok
          ? 'Không thể khôi phục tài khoản lúc này. Vui lòng thử lại.'
          : 'Yêu cầu khôi phục không thành công.';
        const serverGeneralError =
          payload?.errors?.general ||
          (!serverFieldError ? payload?.message || fallbackMsg : '');
        if (serverGeneralError) {
          setGeneralError(serverGeneralError);
        }
        return;
      }

      setSubmittedResult({
        personalEmail: payload?.data?.personalEmail || trimmedEmail,
        message:
          payload?.message ||
          'Email đăng nhập nội bộ và mật khẩu tạm thời mới đã được gửi tới email cá nhân của bạn.'
      });
      setCooldownSeconds(Number(payload?.data?.cooldownSeconds || 60));
    } catch {
      setGeneralError('Không thể kết nối đến máy chủ quản trị. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="admin-auth-backdrop" aria-hidden="true">
        <img
          src="/assets/images/hotel-saigon.jpg"
          alt=""
          className="admin-auth-backdrop-img"
        />
        <div className="admin-auth-glow" />
      </div>

      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-icon-box" aria-hidden="true">
            <Hotel size={22} />
          </div>
          <div>
            <div className="brand-name">VietPeace Stay</div>
            <div className="brand-sub">HỆ THỐNG QUẢN TRỊ NGHỈ DƯỠNG</div>
          </div>
        </div>

        <h1 className="auth-title">Quên mật khẩu quản trị</h1>
        <p className="auth-subtitle">
          Nhập email cá nhân (Gmail) đã liên kết với tài khoản Admin hoặc Quản lý cơ sở để nhận lại email đăng nhập nội bộ cùng mật khẩu tạm thời mới.
        </p>

        {!submittedResult ? (
          <form className="admin-auth-form" onSubmit={handleSubmit} noValidate>
            {generalError && (
              <div className="admin-auth-alert" role="alert">
                <AlertCircle size={15} aria-hidden="true" />
                <span>{generalError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="forgot-personal-email">
                Email cá nhân (Gmail đã đăng ký) <span className="required">*</span>
              </label>
              <div className="admin-auth-input-wrap">
                <Mail size={16} className="admin-auth-input-icon" aria-hidden="true" />
                <input
                  id="forgot-personal-email"
                  name="personalEmail"
                  type="email"
                  autoComplete="email"
                  enterKeyHint="send"
                  required
                  aria-invalid={fieldError ? 'true' : 'false'}
                  className={`form-input admin-auth-input--with-icon ${
                    fieldError ? 'form-input--invalid' : ''
                  }`}
                  placeholder="vi-du@gmail.com"
                  value={personalEmail}
                  onChange={handleEmailChange}
                />
              </div>
              <p className="admin-auth-hint">
                Vui lòng nhập email cá nhân nhận thư khôi phục, không nhập email đăng nhập nội bộ.
              </p>
              {fieldError && (
                <span className="form-error-text" role="alert">
                  <AlertCircle size={13} aria-hidden="true" />
                  <span>{fieldError}</span>
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn admin-auth-submit"
              disabled={isSubmitting || cooldownSeconds > 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="admin-auth-spin" aria-hidden="true" />
                  <span>Đang gửi email khôi phục...</span>
                </>
              ) : cooldownSeconds > 0 ? (
                <span>Vui lòng chờ {cooldownSeconds}s để gửi lại</span>
              ) : (
                <>
                  <Send size={15} aria-hidden="true" />
                  <span>Nhận lại email nội bộ &amp; mật khẩu mới</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="admin-auth-form">
            <div className="admin-auth-success-box" role="status">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <CheckCircle2 size={20} aria-hidden="true" />
                <span>Đã gửi thông tin đăng nhập mới</span>
              </div>
              <p style={{ margin: 0 }}>{submittedResult.message}</p>
              <p style={{ margin: 0 }}>
                Hộp thư nhận: <strong>{submittedResult.personalEmail}</strong>
              </p>
              <p style={{ margin: 0 }}>
                Hãy kiểm tra Hộp thư đến (hoặc Spam/Quảng cáo) để xem <strong>email đăng nhập nội bộ</strong> và <strong>mật khẩu tạm thời mới</strong>. Sau khi đăng nhập, bạn sẽ được yêu cầu đặt mật khẩu mới.
              </p>
            </div>

            <Link to="/login" className="btn admin-auth-submit" style={{ textDecoration: 'none' }}>
              Quay lại trang đăng nhập
            </Link>

            <button
              type="button"
              className="admin-auth-secondary-btn"
              disabled={cooldownSeconds > 0}
              onClick={() => {
                setSubmittedResult(null);
                setGeneralError('');
                setFieldError('');
              }}
            >
              {cooldownSeconds > 0
                ? `Thử lại với email khác (${cooldownSeconds}s)`
                : 'Gửi lại với email cá nhân khác'}
            </button>
          </div>
        )}

        <div className="admin-auth-footer">
          <Link to="/login" className="admin-auth-back-link">
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Quay lại trang đăng nhập</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
