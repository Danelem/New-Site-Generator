/**
 * Shared CSS for the Creatine Report template.
 * This is the single source of truth for the template styling,
 * used both in the React component preview and the static HTML export.
 */
export const CREATINE_REPORT_CSS = `.container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* Brand Bar */
.brand-bar {
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  padding: 12px 0;
}

.brand-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  background-color: #f0f0f0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.brand-text {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

/* Dark Nav Bar */
.nav-bar {
  background-color: #2c2c2c;
  padding: 0;
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  gap: 32px;
}

.nav-link {
  color: #ffffff;
  text-decoration: none;
  padding: 16px 0;
  font-size: 14px;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #cccccc;
}

/* Main Content */
.page-shell {
  padding: 40px 20px;
}

.page-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 32px;
}

@media (max-width: 968px) {
  .page-inner {
    grid-template-columns: 1fr;
  }
}

/* Left Column */
.review-panel {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 32px;
}

.breadcrumb {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.page-title {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.updated-tag {
  font-size: 12px;
  color: #888;
  margin-bottom: 24px;
}

/* Review Panel Box */
.review-box {
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 32px;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.review-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex: 1;
}

.overall-rating {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.rating-value {
  font-size: 28px;
  font-weight: bold;
  color: #d32f2f;
}

.rating-stars {
  font-size: 18px;
  color: #ffa000;
}

.stars {
  color: #ffa000;
  font-size: 16px;
  letter-spacing: 2px;
}

.rating-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.rating-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rating-label {
  font-size: 14px;
  color: #666;
}

.rating-score {
  font-size: 14px;
}

.product-image {
  margin-bottom: 20px;
}

.image-placeholder {
  width: 100%;
  height: 200px;
  background-color: #e0e0e0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.cta-button {
  display: block;
  width: 100%;
  padding: 14px;
  background-color: #d32f2f;
  color: #ffffff;
  text-align: center;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 600;
  transition: background-color 0.2s;
}

.cta-button:hover {
  background-color: #b71c1c;
}

/* Main Lead */
.main-lead {
  font-size: 18px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 32px;
  font-weight: 500;
}

/* Sections */
.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #d32f2f;
  margin: 0 0 16px 0;
}

.paragraph {
  font-size: 16px;
  line-height: 1.7;
  color: #444;
  margin-bottom: 16px;
}

.benefits-list {
  list-style: disc;
  padding-left: 24px;
  margin: 0;
}

.benefits-list li {
  font-size: 16px;
  line-height: 1.7;
  color: #444;
  margin-bottom: 12px;
}

/* Right Column - Sidebar */
.sidebar-box {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.sidebar-title {
  font-size: 20px;
  font-weight: 600;
  color: #d32f2f;
  margin: 0 0 16px 0;
}

.sidebar-list {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
}

.sidebar-list li {
  font-size: 14px;
  line-height: 1.6;
  color: #444;
  margin-bottom: 10px;
}

/* Newsletter Box */
.newsletter-box {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.newsletter-title {
  font-size: 20px;
  font-weight: 600;
  color: #d32f2f;
  margin: 0 0 12px 0;
}

.newsletter-desc {
  font-size: 14px;
  line-height: 1.6;
  color: #666;
  margin-bottom: 16px;
}

.newsletter-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.newsletter-input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.newsletter-input:focus {
  outline: none;
  border-color: #d32f2f;
}

.newsletter-button {
  padding: 12px;
  background-color: #d32f2f;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.newsletter-button:hover {
  background-color: #b71c1c;
}
`;
