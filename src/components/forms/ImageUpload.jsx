import React, { useRef } from 'react';
import { UploadCloud, X } from 'lucide-react';

export default function ImageUpload({
  label,
  images = [],
  onChange,
  multiple = false,
  helperText = "Tải lên tệp ảnh JPG hoặc PNG chất lượng cao (tối đa 5MB mỗi ảnh)."
  , onFilesSelected
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (onFilesSelected) {
      onFilesSelected(files);
      return;
    }
    const newImageUrls = files.map((file) => URL.createObjectURL(file));

    if (multiple) {
      onChange([...images, ...newImageUrls]);
    } else {
      onChange(newImageUrls);
    }
  };

  const handleRemove = (indexToRemove) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}

      <div
        className="image-upload-zone"
        onClick={() => fileInputRef.current?.click()}
        tabIndex={0}
        role="button"
        aria-label="Tải ảnh lên"
      >
        <UploadCloud size={28} color="#6B7280" style={{ margin: '0 auto 6px' }} />
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#292D32' }}>
          Nhấp hoặc kéo thả tệp hình ảnh vào đây
        </div>
        <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '2px' }}>
          {helperText}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {images.length > 0 && (
        <div className="image-preview-grid">
          {images.map((imgSrc, idx) => (
            <div key={idx} className="image-preview-item">
              <img
                src={imgSrc}
                alt={`Hình ảnh xem trước ${idx + 1}`}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <button
                type="button"
                className="image-preview-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(idx);
                }}
                title="Xóa ảnh"
                aria-label="Xóa ảnh"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
