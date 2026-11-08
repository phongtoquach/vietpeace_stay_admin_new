import React from 'react';

export default function PageHeader({ title, description, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-info">
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
