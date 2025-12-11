import type { CreatineReportProps } from "@/components/templates/CreatineReportTemplate";
import type { StaticFile } from "./buildCreatineReportFiles";
import { CREATINE_REPORT_CSS } from "@/lib/templates/creatineReportCss";

export function buildCreatineReportReactFiles(
  props: CreatineReportProps,
  slug: string
): StaticFile[] {
  // Build config object from props
  const config = {
    breadcrumb: props.breadcrumb,
    pageTitle: props.pageTitle,
    updatedTag: props.updatedTag,
    productName: props.productName,
    productImageAlt: props.productImageAlt,
    mainLead: props.mainLead,
    mainBenefits: props.mainBenefits,
    effectivenessParagraphs: props.effectivenessParagraphs,
    comparisonParagraphs: props.comparisonParagraphs,
    reviewParagraphs: props.reviewParagraphs,
    bottomLineParagraph: props.bottomLineParagraph,
    ratings: props.ratings,
    productUrl: props.productUrl,
    sidebarDiscoverItems: props.sidebarDiscoverItems,
    sidebarTopItems: props.sidebarTopItems,
    newsletterTitle: props.newsletterTitle,
    newsletterDesc: props.newsletterDesc,
  };

  // Generate React component source
  const componentSource = `import React from "react";
import "./styles.css";

export type CreatineLandingProps = typeof config;

const config = ${JSON.stringify(config, null, 2)};

const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  return (
    <span className="stars">
      {\`\${'★'.repeat(fullStars)}\${hasHalfStar ? '½' : ''}\${'☆'.repeat(emptyStars)}\`}
    </span>
  );
};

export const CreatineLanding: React.FC<CreatineLandingProps> = (props) => {
  const data = { ...config, ...props };

  return (
    <div className="container">
      {/* Brand Bar */}
      <div className="brand-bar">
        <div className="brand-inner">
          <span className="brand-logo">CR</span>
          <span className="brand-text">Creatine Report</span>
        </div>
      </div>

      {/* Dark Nav Bar */}
      <nav className="nav-bar">
        <div className="nav-inner">
          <a href="#" className="nav-link">Top Products</a>
          <a href="#" className="nav-link">Creatine Information</a>
          <a href="#" className="nav-link">Product Comparison</a>
          <a href="#" className="nav-link">FAQ</a>
          <a href="#" className="nav-link">Contact Us</a>
        </div>
      </nav>

      {/* Main Content */}
      <div className="page-shell">
        <div className="page-inner">
          {/* Left Column - Review Panel & Content */}
          <div>
            <div className="review-panel">
              {/* Breadcrumb */}
              <div className="breadcrumb">{data.breadcrumb}</div>

              {/* Page Title */}
              <h1 className="page-title">{data.pageTitle}</h1>
              <div className="updated-tag">{data.updatedTag}</div>

              {/* Review Box */}
              <div className="review-box">
                <div className="review-header">
                  <h2 className="review-title">{data.productName}</h2>
                  <div className="overall-rating">
                    <div className="rating-value">{data.ratings.overallRating.toFixed(1)}</div>
                    <div className="rating-stars">{renderStars(data.ratings.overallRating)}</div>
                  </div>
                </div>
                <div className="rating-grid">
                  <div className="rating-item">
                    <span className="rating-label">Customer Service</span>
                    <span className="rating-score">{renderStars(data.ratings.customerService)}</span>
                  </div>
                  <div className="rating-item">
                    <span className="rating-label">Value Rating</span>
                    <span className="rating-score">{renderStars(data.ratings.valueRating)}</span>
                  </div>
                  <div className="rating-item">
                    <span className="rating-label">Customer Rating</span>
                    <span className="rating-score">{renderStars(data.ratings.customerRating)}</span>
                  </div>
                </div>
                <div className="product-image">
                  <div className="image-placeholder">{data.productImageAlt}</div>
                </div>
                <a href={data.productUrl} className="cta-button" target="_blank" rel="noopener noreferrer">
                  View Product
                </a>
              </div>

              {/* Main Lead */}
              <div className="main-lead">{data.mainLead}</div>

              {/* Main Benefits */}
              {data.mainBenefits.length > 0 && (
                <section className="section">
                  <h2 className="section-title">Main Benefits</h2>
                  <ul className="benefits-list">
                    {data.mainBenefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Effectiveness */}
              {data.effectivenessParagraphs.length > 0 && (
                <section className="section">
                  <h2 className="section-title">Effectiveness</h2>
                  {data.effectivenessParagraphs.map((paragraph, index) => (
                    <p key={index} className="paragraph">{paragraph}</p>
                  ))}
                </section>
              )}

              {/* Comparison */}
              {data.comparisonParagraphs.length > 0 && (
                <section className="section">
                  <h2 className="section-title">Comparison</h2>
                  {data.comparisonParagraphs.map((paragraph, index) => (
                    <p key={index} className="paragraph">{paragraph}</p>
                  ))}
                </section>
              )}

              {/* Reviews */}
              {data.reviewParagraphs.length > 0 && (
                <section className="section">
                  <h2 className="section-title">Reviews</h2>
                  {data.reviewParagraphs.map((paragraph, index) => (
                    <p key={index} className="paragraph">{paragraph}</p>
                  ))}
                </section>
              )}

              {/* Bottom Line */}
              <section className="section">
                <h2 className="section-title">Bottom Line</h2>
                <p className="paragraph">{data.bottomLineParagraph}</p>
              </section>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div>
            {/* What You'll Discover */}
            <div className="sidebar-box">
              <h3 className="sidebar-title">What You'll Discover</h3>
              <ul className="sidebar-list">
                {data.sidebarDiscoverItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Top 6 Items to Consider */}
            <div className="sidebar-box">
              <h3 className="sidebar-title">Top 6 Items to Consider</h3>
              <ul className="sidebar-list">
                {data.sidebarTopItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Newsletter Box */}
            <div className="newsletter-box">
              <h3 className="newsletter-title">{data.newsletterTitle}</h3>
              <p className="newsletter-desc">{data.newsletterDesc}</p>
              <form className="newsletter-form">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="newsletter-input"
                />
                <button type="submit" className="newsletter-button">
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
`;

  return [
    { path: "styles.css", contents: CREATINE_REPORT_CSS },
    { path: `${slug}.config.json`, contents: JSON.stringify(config, null, 2) },
    { path: "LandingPage.tsx", contents: componentSource },
  ];
}
