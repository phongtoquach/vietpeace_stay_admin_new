import { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import AuthContext from '../../context/AuthContext';

import { Hotel, Eye, EyeOff, Mail, Lock, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';

const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:3002/api/admin';
const REMEMBER_EMAIL_STORAGE_KEY = 'vietpeace_admin_remember_email';
const REMEMBER_FLAG_STORAGE_KEY = 'vietpeace_admin_remember_me';

function readRememberMePreference() {
	try {
		return localStorage.getItem(REMEMBER_FLAG_STORAGE_KEY) === 'true';
	} catch {
		return false;
	}
}

function writeRememberMePreference(enabled, email = '') {
	try {
		localStorage.setItem(REMEMBER_FLAG_STORAGE_KEY, enabled ? 'true' : 'false');
		if (enabled && email) {
			localStorage.setItem(REMEMBER_EMAIL_STORAGE_KEY, email);
		} else {
			localStorage.removeItem(REMEMBER_EMAIL_STORAGE_KEY);
		}
	} catch {
		// Ignore storage quota/privacy mode errors
	}
}

function readRememberedEmail() {
	try {
		return localStorage.getItem(REMEMBER_EMAIL_STORAGE_KEY) || '';
	} catch {
		return '';
	}
}

function preventSilentAdminCredentialAccess() {
	if (typeof navigator !== 'undefined' && typeof navigator?.credentials?.preventSilentAccess === 'function') {
		return navigator.credentials.preventSilentAccess().catch(() => {});
	}
	return Promise.resolve();
}

function isInputAutofilled(inputEl) {
	if (!inputEl || typeof inputEl.matches !== 'function') return false;
	for (const selector of [':autofill', ':-webkit-autofill']) {
		try {
			if (inputEl.matches(selector)) return true;
		} catch {
			// Ignore unsupported selector
		}
	}
	return false;
}

export default function LoginPage() {
	const { currentLoggedInUser, setCurrentLoggedInUser } = useContext(AuthContext);

	const [showPassword, setShowPassword] = useState(false);
	const [rememberMe, setRememberMe] = useState(() => readRememberMePreference());
	const [hasInteractedWithCredentials, setHasInteractedWithCredentials] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [generalError, setGeneralError] = useState('');
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const queryEmail = searchParams.get('email')?.trim() || '';

	const [formData, setFormData] = useState(() => ({
		email: queryEmail || (readRememberMePreference() ? readRememberedEmail() : ''),
		password: ''
	}));

	const [formErrors, setFormErrors] = useState({});

	const formRef = useRef(null);
	const emailInputRef = useRef(null);
	const passwordInputRef = useRef(null);
	const hasManualInteractionRef = useRef(false);
	const hasUserEditedCredentialsRef = useRef(false);

	useEffect(() => {
		if (currentLoggedInUser) {
			navigate('/admin/dashboard', { replace: true });
		}
	}, [currentLoggedInUser, navigate]);

	const markManualCredentialInteraction = () => {
		hasManualInteractionRef.current = true;
		if (!hasInteractedWithCredentials) {
			setHasInteractedWithCredentials(true);
		}
	};

	const clearAutofilledInputs = () => {
		const nextEmail = queryEmail || '';
		setFormData({ email: nextEmail, password: '' });
		setFormErrors({});
		if (formRef.current && typeof formRef.current.reset === 'function') {
			formRef.current.reset();
		}
		if (emailInputRef.current) {
			emailInputRef.current.value = ' ';
			emailInputRef.current.value = nextEmail;
		}
		if (passwordInputRef.current) {
			passwordInputRef.current.value = ' ';
			passwordInputRef.current.value = '';
		}
	};

	const handleBlockedAutofillAnimation = (event) => {
		if (
			rememberMe ||
			hasManualInteractionRef.current ||
			hasUserEditedCredentialsRef.current ||
			event.animationName !== 'adminAuthAutofillBlock'
		) {
			return;
		}
		clearAutofilledInputs();
	};

	const handleRememberMeChange = (e) => {
		const checked = e.target.checked;
		setRememberMe(checked);
		if (!checked) {
			writeRememberMePreference(false);
			preventSilentAdminCredentialAccess();
			if (isInputAutofilled(emailInputRef.current) || isInputAutofilled(passwordInputRef.current)) {
				clearAutofilledInputs();
			}
		} else {
			writeRememberMePreference(true, formData.email.trim());
		}
	};

	function handleChangeInputValue(e) {
		const { name, value } = e.target;
		const isRealUserInput =
			!isInputAutofilled(e.target) && Boolean(e.nativeEvent?.inputType);
		if (isRealUserInput) {
			hasUserEditedCredentialsRef.current = true;
			markManualCredentialInteraction();
		}

		setFormData((currentFormData) => ({
			...currentFormData,
			[name]: value
		}));

		setFormErrors((currentFormErrors) => ({
			...currentFormErrors,
			[name]: ''
		}));

		if (generalError) {
			setGeneralError('');
		}
	}

	function validateForm() {
		const newFormErrors = {};

		const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
		const trimmedEmail = formData.email.trim();
		if (trimmedEmail === '') {
			newFormErrors.email = 'Vui lòng nhập email nội bộ';
		} else if (!emailRegex.test(trimmedEmail)) {
			newFormErrors.email = 'Email không đúng định dạng';
		}

		const rawPassword = formData.password;
		if (!rawPassword) {
			newFormErrors.password = 'Vui lòng nhập mật khẩu';
		} else if (rawPassword.length < 8) {
			newFormErrors.password = 'Mật khẩu cần có ít nhất 8 ký tự';
		} else if (new TextEncoder().encode(rawPassword).length > 72) {
			newFormErrors.password = 'Mật khẩu không được vượt quá 72 byte UTF-8';
		}

		setFormErrors(newFormErrors);
		return Object.keys(newFormErrors).length === 0;
	}

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (isSubmitting) return;

		const formIsValid = validateForm();
		if (!formIsValid) {
			return;
		}

		setIsSubmitting(true);
		setGeneralError('');

		try {
			const api_response = await fetch(`${ADMIN_API_BASE_URL}/auth/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email: formData.email.trim(),
					password: formData.password,
					rememberMe
				}),
				credentials: 'include'
			});

			let response_data = null;
			try {
				response_data = await api_response.json();
			} catch {
				response_data = null;
			}

			if (!api_response.ok || !response_data?.success) {
				const fieldErrors =
					response_data?.errors && typeof response_data.errors === 'object'
						? response_data.errors
						: {};
				setFormErrors({
					email: fieldErrors.email || '',
					password: fieldErrors.password || ''
				});
				const fallbackMessage = !api_response.ok
					? 'Đăng nhập thất bại. Vui lòng kiểm tra thông tin và thử lại.'
					: 'Đăng nhập không thành công.';
				const computedGeneralError =
					fieldErrors.general ||
					(!fieldErrors.email && !fieldErrors.password ? response_data?.message : '') ||
					(!fieldErrors.email && !fieldErrors.password ? fallbackMessage : '');
				if (computedGeneralError) {
					setGeneralError(computedGeneralError);
				}
				return;
			}

			const trimmedEmail = formData.email.trim();
			writeRememberMePreference(rememberMe, trimmedEmail);

			if (!rememberMe) {
				await preventSilentAdminCredentialAccess();
				setFormData({ email: '', password: '' });
				if (passwordInputRef.current) {
					passwordInputRef.current.value = '';
				}
				if (emailInputRef.current && !queryEmail) {
					emailInputRef.current.value = '';
				}
			} else if (
				typeof window !== 'undefined' &&
				typeof window.PasswordCredential === 'function' &&
				typeof navigator?.credentials?.store === 'function'
			) {
				try {
					const loginUser = response_data.data.loginUserData;
					const credential = new window.PasswordCredential({
						id: trimmedEmail,
						password: formData.password,
						name: loginUser.fullName || loginUser.displayName || trimmedEmail
					});
					await navigator.credentials.store(credential);
				} catch {
					// Ignore if browser rejects or doesn't support Credential Management API
				}
			}

			setCurrentLoggedInUser(response_data.data.loginUserData);
			navigate('/admin/dashboard', { replace: true });
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
					decoding="async"
					fetchPriority="high"
				/>
				<div className="admin-auth-scrim" />
				<div className="admin-auth-glow" />
			</div>

			<div className="auth-card">
				<div className="auth-brand">
					<div className="brand-icon-box">
						<Hotel size={22} strokeWidth={2.2} aria-hidden="true" />
					</div>
					<div style={{ textAlign: 'left' }}>
						<div className="auth-brand-name">
							VietPeace Stay
						</div>
						<div className="auth-brand-sub">
							HỆ THỐNG QUẢN TRỊ NGHỈ DƯỠNG
						</div>
					</div>
				</div>

				<h1 className="auth-title">Cổng thông tin quản trị</h1>
				<p className="auth-subtitle">
					Đăng nhập bằng tài khoản nhân sự nội bộ để quản lý đặt phòng và các cơ sở lưu trú.
				</p>

				<form
					ref={formRef}
					className="admin-auth-form"
					method="POST"
					autoComplete={rememberMe ? 'on' : 'off'}
					onSubmit={handleSubmit}
					noValidate
				>
					{generalError && (
						<div className="admin-auth-alert" role="alert">
							<AlertCircle size={15} aria-hidden="true" />
							<span>{generalError}</span>
						</div>
					)}
					<div className="form-group">
						<label className="form-label" htmlFor="login-email">
							Địa chỉ Email nội bộ <span className="required" aria-hidden="true">*</span>
						</label>
						<div className="admin-auth-input-wrap">
							<Mail size={16} className="admin-auth-input-icon" aria-hidden="true" />
							<input
								ref={emailInputRef}
								id="login-email"
								type="email"
								name="email"
								autoComplete={rememberMe ? 'username' : 'off'}
								autoCapitalize="none"
								autoCorrect="off"
								spellCheck={false}
								enterKeyHint="next"
								required
								aria-invalid={formErrors.email ? 'true' : 'false'}
								className={`form-input admin-auth-input--with-icon ${
									!rememberMe && !hasInteractedWithCredentials ? 'admin-auth-input--suppress-autofill' : ''
								} ${formErrors.email ? 'form-input--invalid' : ''}`}
								value={formData.email}
								onPointerDown={markManualCredentialInteraction}
								onKeyDown={(e) => {
									if (e.key !== 'Tab' && e.key !== 'Shift') {
										markManualCredentialInteraction();
									}
								}}
								onPaste={markManualCredentialInteraction}
								onAnimationStart={handleBlockedAutofillAnimation}
								onChange={(e) => handleChangeInputValue(e)}
								placeholder="ten@vietpeacestay.vn"
							/>
						</div>
						{ (formErrors.email) &&
							<span className="form-error-text" role="alert">
								<AlertCircle size={13} aria-hidden="true" />
								<span>{formErrors.email}</span>
							</span>
						}
					</div>

					<div className="form-group">
						<div className="admin-auth-label-row">
							<label className="form-label" htmlFor="login-password">
								Mật khẩu <span className="required" aria-hidden="true">*</span>
							</label>
							<Link
								to="/forgot-password"
								className="admin-auth-forgot-link"
							>
								Quên mật khẩu?
							</Link>
						</div>
						<div className="admin-auth-input-wrap">
							<Lock size={16} className="admin-auth-input-icon" aria-hidden="true" />
							<input
								ref={passwordInputRef}
								id="login-password"
								type={showPassword ? 'text' : 'password'}
								name="password"
								autoComplete={rememberMe ? 'current-password' : 'one-time-code'}
								enterKeyHint="done"
								required
								aria-invalid={formErrors.password ? 'true' : 'false'}
								className={`form-input admin-auth-input--with-icon admin-auth-input--password ${
									!rememberMe && !hasInteractedWithCredentials ? 'admin-auth-input--suppress-autofill' : ''
								} ${formErrors.password ? 'form-input--invalid' : ''}`}
								value={formData.password}
								onPointerDown={markManualCredentialInteraction}
								onKeyDown={(e) => {
									if (e.key !== 'Tab' && e.key !== 'Shift') {
										markManualCredentialInteraction();
									}
								}}
								onPaste={markManualCredentialInteraction}
								onAnimationStart={handleBlockedAutofillAnimation}
								onChange={(e) => handleChangeInputValue(e)}
								placeholder="Nhập mật khẩu của bạn"
							/>
							<button
								type="button"
								className="admin-auth-pw-toggle"
								onClick={() => setShowPassword(!showPassword)}
								aria-pressed={showPassword}
								aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
								aria-describedby="admin-pw-toggle-warning"
							>
								{showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
							</button>
							<span id="admin-pw-toggle-warning" className="admin-auth-visually-hidden">
								Cảnh báo: thao tác này sẽ hiển thị mật khẩu của bạn trên màn hình.
							</span>
						</div>
						{ (formErrors.password) &&
							<span className="form-error-text" role="alert">
								<AlertCircle size={13} aria-hidden="true" />
								<span>{formErrors.password}</span>
							</span>
						}
					</div>

					<div className="admin-auth-remember-row">
						<label className="form-checkbox-label">
							<input
								type="checkbox"
								checked={rememberMe}
								onChange={handleRememberMeChange}
							/>
							<span>Ghi nhớ phiên đăng nhập</span>
						</label>
					</div>

					<button
						type="submit"
						className="btn admin-auth-submit"
						disabled={isSubmitting}
					>
						{isSubmitting ? (
							<>
								<Loader2 size={16} className="admin-auth-spin" aria-hidden="true" />
								<span>Đang xác thực...</span>
							</>
						) : (
							'Đăng nhập hệ thống'
						)}
					</button>
				</form>

				<div className="admin-auth-footer">
					<ShieldCheck size={15} className="admin-auth-footer-icon" aria-hidden="true" />
					<span>Hệ thống hạ tầng quản trị lưu trú nội bộ. Chỉ dành cho nhân sự được phân quyền.</span>
				</div>
			</div>
		</div>
	);
}
