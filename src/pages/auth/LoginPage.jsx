import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import AuthContext from '../../context/AuthContext';
import { useAdmin } from '../../context/AdminContext.jsx';

import { Hotel, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
	const { setCurrentLoggedInUser } = useContext(AuthContext);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [rememberMe, setRememberMe] = useState(true);
	const { login } = useAdmin();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	useEffect(() => {
		const emailParam = searchParams.get('email');
		if (emailParam) {
			setFormData((prev) => ({ ...prev, email: emailParam.trim() }));
		}
	}, [searchParams]);

	console.log("[LoginPage] Day là ngay trước dòng khai báo biến useState formData !");
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    console.log("[LoginPage] Day là ngay trước dòng khai báo biến useState formErrors !");
	const [formErrors, setFormErrors] = useState({});

	console.log("[LoginPage] Value hien tai cua biến useState formData : ");
	console.log(formData);
	console.log("[LoginPage] Value hien tai cua biến useState formErrors : ");
	console.log(formErrors);

	function handleChangeInputValue(e) {
        const { name, value } = e.target;

        console.log("[handleChangeInputValue] Đang chạy hàm handleChangeInputValue() ! name : " + name + " ; value : " + value);

        console.log("[handleChangeInputValue] setFormData() !");
        setFormData((currentFormData) => {
            console.log("[handleChangeInputValue - setFormData] Data ban đầu của currentFormData :");
            console.log(currentFormData);

            const newFormData = {...currentFormData, [name]: value};
            console.log("[handleChangeInputValue - setFormData] Data của newFormData :");
            console.log(newFormData);

            return newFormData;
        });

        console.log("[handleChangeInputValue] setFormErrors() !");
        setFormErrors((currentFormErrors) => {
            console.log("[handleChangeInputValue - setFormErrors] Data ban đầu của currentFormErrors :");
            console.log(currentFormErrors);

            const newErrors = {...currentFormErrors, [name]: ""};
            console.log("[handleChangeInputValue - setFormErrors] Data của newErrors :");
            console.log(newErrors);

            return newErrors;
        });

        console.log("[handleChangeInputValue] Kết thúc hàm handleChangeInputValue() !");
    }

	function validateForm() {
		console.log("[validateForm] Đang chạy hàm validateForm() ! Value hiện tại của biến useState formData :");
        console.log(formData);

        const newFormErrors = {};

		// validate email
        let emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        let email = formData.email.trim();
        console.log("[validateForm] email : " + email);
        if (email == "") {
            console.log("[validateForm] email rong ! set error msg !");
            newFormErrors.email = "Vui lòng nhập email";
        }
        else if (emailRegex.test(email) == false) {
            console.log("[validateForm] email không đúng email format ! set error msg !");
            newFormErrors.email = "Email không đúng định dạng";
        }

		// validate password
        let password = formData.password.trim();
        console.log("[validateForm] password : " + password);
        if (password == "") {
            console.log("[validateForm] password rong ! set error msg !");
            newFormErrors.password = "Vui lòng nhập mật khẩu";
        }
        else if (password.length < 8) {
            console.log("[validateForm] password co duoi 8 ky tu ! set error msg !");
            newFormErrors.password = "Mật khẩu cần có ít nhất 8 ký tự";
        }

		console.log("[validateForm] setFormErrors(newFormErrors)");
        console.log(newFormErrors);
        setFormErrors(newFormErrors);

		// return true / false
        return Object.keys(newFormErrors).length === 0;
	}

	const handleSubmit = async (e) => {
		e.preventDefault();

		console.log("[handleSubmit] Đang chạy hàm handleSubmit() !");

        const formIsValid = validateForm();
        console.log("[handleSubmit] Kết quả hàm validateForm() : " + formIsValid);

        if (!formIsValid) {
            console.log("[handleSubmit] Form is not valid ! Ngưng chạy hàm handleSubmit() !");
            return;
        }

        console.log("[handleSubmit] Form is valid ! Bat dau goi API login !");
		//return;

		//login(email, password);

		const api_response = await fetch(`http://localhost:3002/api/admin/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
			body: JSON.stringify({
				email: formData.email,
				password: formData.password
			}),
            credentials: "include"
        });
        console.log("[LoginPage - handleSubmit] Response cua API /auth/login : ", api_response);

        if (!api_response.ok) {
            alert("Calling login API has been failed !");
        }

        const response_data = await api_response.json();
        console.log("[LoginPage - handleSubmit] API response OK ! Data cua response_data : ", response_data);

		if (!response_data.success) {
			console.log("[LoginPage - handleSubmit] response_data.success = false ! Thực hiện setFormErrors(response_data.errors) !");
			setFormErrors(response_data.errors);
			return;
		}

		console.log("[LoginPage - handleSubmit] response_data.success = true ! Chuyen den route /admin/dashboard !");
		setCurrentLoggedInUser(response_data.data.loginUserData);

		navigate('/admin/dashboard');
	};

	return (
		<div className="auth-page">
			<div className="auth-card">
				<div className="auth-brand">
					<div className="brand-icon-box" style={{ width: '38px', height: '38px' }}>
						<Hotel size={22} strokeWidth={2.2} />
					</div>
					<div style={{ textAlign: 'left' }}>
						<div style={{ fontSize: '17px', fontWeight: 700, color: '#292D32' }}>
						VietPeace Stay
						</div>
						<div style={{ fontSize: '11px', color: '#6B7280' }}>
						HỆ THỐNG QUẢN TRỊ NGHỈ DƯỠNG
						</div>
					</div>
				</div>


				<h1 className="auth-title">Cổng thông tin quản trị</h1>
				<p className="auth-subtitle">
				Đăng nhập bằng tài khoản nhân sự nội bộ để quản lý đặt phòng và các cơ sở lưu trú.
				</p>

				<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
					<div className="form-group">
						<label className="form-label" htmlFor="login-email">
						Địa chỉ Email nội bộ <span className="required">*</span>
						</label>
						<input
							id="login-email"
							type="text"
							name="email"
							className="form-input"
							value={formData.email}
							onChange={(e) => handleChangeInputValue(e)}
							placeholder="ten@vietpeacestay.vn"/>
						{ (formErrors.email) &&
							<span className="form-error-text">{formErrors.email}</span>
						}
					</div>

					<div className="form-group">
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<label className="form-label" htmlFor="login-password">
								Mật khẩu <span className="required">*</span>
							</label>
							<Link
								to="/forgot-password"
								style={{ fontSize: '12px', color: '#6C4200', textDecoration: 'underline' }}
							>
								Quên mật khẩu?
							</Link>
							</div>
						<div style={{ position: 'relative' }}>
							<input
								id="login-password"
								type={showPassword ? 'text' : 'password'}
								name="password"
								className="form-input"
								style={{ paddingRight: '36px' }}
								value={formData.password}
								onChange={(e) => handleChangeInputValue(e)}
								placeholder="Nhập mật khẩu của bạn"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								style={{
								position: 'absolute',
								right: '8px',
								top: '50%',
								transform: 'translateY(-50%)',
								color: '#6B7280'
								}}
								aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
							>
								{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
							</button>
							{ (formErrors.password) &&
								<span className="form-error-text">{formErrors.password}</span>
							}
						</div>
					</div>

					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0' }}>
						<label className="form-checkbox-label">
						<input
							type="checkbox"
							checked={rememberMe}
							onChange={(e) => setRememberMe(e.target.checked)}
						/>
						<span style={{ fontSize: '12.5px' }}>Ghi nhớ phiên đăng nhập</span>
						</label>
					</div>

					<button
						type="submit"
						className="btn btn-primary"
						style={{ width: '100%', height: '38px', fontSize: '14px', marginTop: '6px' }}
					>
						Đăng nhập hệ thống
					</button>
				</form>

				<div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E5E7EB', textAlign: 'center', fontSize: '11.5px', color: '#6B7280' }}>
					Hệ thống hạ tầng quản trị lưu trú nội bộ. Chỉ dành cho nhân sự được phân quyền.
				</div>
			</div>
		</div>
	);
}
