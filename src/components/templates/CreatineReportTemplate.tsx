'use client';

import React, { useEffect } from 'react';
import { CREATINE_REPORT_CSS } from '@/lib/templates/creatineReportCss';

export type CreatineReportProps = {
  breadcrumb: string;
  pageTitle: string;
  updatedTag: string;
  productName: string;
  productImageAlt: string;
  mainLead: string;
  mainBenefits: string[];
  effectivenessParagraphs: string[];
  comparisonParagraphs: string[];
  reviewParagraphs: string[];
  bottomLineParagraph: string;
  ratings: {
    customerService: number;
    valueRating: number;
    customerRating: number;
    overallRating: number;
  };
  productUrl: string;
  sidebarDiscoverItems: string[];
  sidebarTopItems: string[];
  newsletterTitle: string;
  newsletterDesc: string;
};

export default function CreatineReportTemplate({
  breadcrumb,
  pageTitle,
  updatedTag,
  productName,
  productImageAlt,
  mainLead,
  mainBenefits,
  effectivenessParagraphs,
  comparisonParagraphs,
  reviewParagraphs,
  bottomLineParagraph,
  ratings,
  productUrl,
  sidebarDiscoverItems,
  sidebarTopItems,
  newsletterTitle,
  newsletterDesc,
}: CreatineReportProps) {
  // Inject CSS into the document head
  useEffect(() => {
    const styleId = 'creatine-report-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = CREATINE_REPORT_CSS;
      document.head.appendChild(style);
    }
    return () => {
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
      }
    };
  }, []);

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    return (
      <span className="stars">
        {'★'.repeat(fullStars)}
        {hasHalfStar && '½'}
        {'☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0))}
      </span>
    );
  };

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
                <div className="breadcrumb">{breadcrumb}</div>

              {/* Page Title */}
                <h1 className="page-title">{pageTitle}</h1>
                <div className="updated-tag">{updatedTag}</div>

                {/* Review Box */}
                <div className="review-box">
                  <div className="review-header">
                    <h2 className="review-title">{productName}</h2>
                    <div className="overall-rating">
                      <div className="rating-value">{ratings.overallRating.toFixed(1)}</div>
                      <div className="rating-stars">{renderStars(ratings.overallRating)}</div>
                  </div>
                </div>
                  <div className="rating-grid">
                    <div className="rating-item">
                      <span className="rating-label">Customer Service</span>
                      <span className="rating-score">{renderStars(ratings.customerService)}</span>
                  </div>
                    <div className="rating-item">
                      <span className="rating-label">Value Rating</span>
                      <span className="rating-score">{renderStars(ratings.valueRating)}</span>
                  </div>
                    <div className="rating-item">
                      <span className="rating-label">Customer Rating</span>
                      <span className="rating-score">{renderStars(ratings.customerRating)}</span>
                  </div>
                </div>
                  <div className="product-image">
                    <div className="image-placeholder">{productImageAlt}</div>
                </div>
                  <a href={productUrl} className="cta-button" target="_blank" rel="noopener noreferrer">
                  View Product
                </a>
              </div>

              {/* Main Lead */}
                <div className="main-lead">{mainLead}</div>

              {/* Main Benefits */}
              {mainBenefits.length > 0 && (
                  <section className="section">
                    <h2 className="section-title">Main Benefits</h2>
                    <ul className="benefits-list">
                    {mainBenefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Effectiveness */}
              {effectivenessParagraphs.length > 0 && (
                  <section className="section">
                    <h2 className="section-title">Effectiveness</h2>
                  {effectivenessParagraphs.map((paragraph, index) => (
                      <p key={index} className="paragraph">{paragraph}</p>
                  ))}
                </section>
              )}

              {/* Comparison */}
              {comparisonParagraphs.length > 0 && (
                  <section className="section">
                    <h2 className="section-title">Comparison</h2>
                  {comparisonParagraphs.map((paragraph, index) => (
                      <p key={index} className="paragraph">{paragraph}</p>
                  ))}
                </section>
              )}

              {/* Reviews */}
              {reviewParagraphs.length > 0 && (
                  <section className="section">
                    <h2 className="section-title">Reviews</h2>
                  {reviewParagraphs.map((paragraph, index) => (
                      <p key={index} className="paragraph">{paragraph}</p>
                  ))}
                </section>
              )}

              {/* Bottom Line */}
                <section className="section">
                  <h2 className="section-title">Bottom Line</h2>
                  <p className="paragraph">{bottomLineParagraph}</p>
              </section>
            </div>
          </div>

          {/* Right Column - Sidebar */}
            <div>
            {/* What You'll Discover */}
              <div className="sidebar-box">
                <h3 className="sidebar-title">What You&apos;ll Discover</h3>
                <ul className="sidebar-list">
                {sidebarDiscoverItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Top 6 Items to Consider */}
              <div className="sidebar-box">
                <h3 className="sidebar-title">Top 6 Items to Consider</h3>
                <ul className="sidebar-list">
                {sidebarTopItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Newsletter Box */}
              <div className="newsletter-box">
                <h3 className="newsletter-title">{newsletterTitle}</h3>
                <p className="newsletter-desc">{newsletterDesc}</p>
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
}

