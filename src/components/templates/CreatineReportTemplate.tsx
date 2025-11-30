import React from 'react';
import styles from './CreatineReportTemplate.module.css';

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
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    return (
      <span className={styles.stars}>
        {'★'.repeat(fullStars)}
        {hasHalfStar && '½'}
        {'☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0))}
      </span>
    );
  };

  return (
    <div className={styles.container}>
      {/* Brand Bar */}
      <div className={styles.brandBar}>
        <div className={styles.brandContent}>
          <span className={styles.brandLogo}>CR</span>
          <span className={styles.brandText}>Creatine Report</span>
        </div>
      </div>

      {/* Dark Nav Bar */}
      <nav className={styles.navBar}>
        <div className={styles.navContent}>
          <a href="#" className={styles.navLink}>Top Products</a>
          <a href="#" className={styles.navLink}>Creatine Information</a>
          <a href="#" className={styles.navLink}>Product Comparison</a>
          <a href="#" className={styles.navLink}>FAQ</a>
          <a href="#" className={styles.navLink}>Contact Us</a>
        </div>
      </nav>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {/* Left Column - Review Panel & Content */}
          <div className={styles.leftColumn}>
            <div className={styles.contentCard}>
              {/* Breadcrumb */}
              <div className={styles.breadcrumb}>{breadcrumb}</div>

              {/* Page Title */}
              <h1 className={styles.pageTitle}>{pageTitle}</h1>
              <div className={styles.updatedTag}>{updatedTag}</div>

              {/* Review Panel */}
              <div className={styles.reviewPanel}>
                <div className={styles.reviewHeader}>
                  <h2 className={styles.reviewTitle}>{productName}</h2>
                  <div className={styles.overallRating}>
                    <div className={styles.ratingValue}>{ratings.overallRating.toFixed(1)}</div>
                    <div className={styles.ratingStars}>{renderStars(ratings.overallRating)}</div>
                  </div>
                </div>
                <div className={styles.ratingGrid}>
                  <div className={styles.ratingItem}>
                    <span className={styles.ratingLabel}>Customer Service</span>
                    <span className={styles.ratingScore}>{renderStars(ratings.customerService)}</span>
                  </div>
                  <div className={styles.ratingItem}>
                    <span className={styles.ratingLabel}>Value Rating</span>
                    <span className={styles.ratingScore}>{renderStars(ratings.valueRating)}</span>
                  </div>
                  <div className={styles.ratingItem}>
                    <span className={styles.ratingLabel}>Customer Rating</span>
                    <span className={styles.ratingScore}>{renderStars(ratings.customerRating)}</span>
                  </div>
                </div>
                <div className={styles.productImage}>
                  <div className={styles.imagePlaceholder}>{productImageAlt}</div>
                </div>
                <a href={productUrl} className={styles.ctaButton} target="_blank" rel="noopener noreferrer">
                  View Product
                </a>
              </div>

              {/* Main Lead */}
              <div className={styles.mainLead}>{mainLead}</div>

              {/* Main Benefits */}
              {mainBenefits.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Main Benefits</h2>
                  <ul className={styles.benefitsList}>
                    {mainBenefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Effectiveness */}
              {effectivenessParagraphs.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Effectiveness</h2>
                  {effectivenessParagraphs.map((paragraph, index) => (
                    <p key={index} className={styles.paragraph}>{paragraph}</p>
                  ))}
                </section>
              )}

              {/* Comparison */}
              {comparisonParagraphs.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Comparison</h2>
                  {comparisonParagraphs.map((paragraph, index) => (
                    <p key={index} className={styles.paragraph}>{paragraph}</p>
                  ))}
                </section>
              )}

              {/* Reviews */}
              {reviewParagraphs.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Reviews</h2>
                  {reviewParagraphs.map((paragraph, index) => (
                    <p key={index} className={styles.paragraph}>{paragraph}</p>
                  ))}
                </section>
              )}

              {/* Bottom Line */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Bottom Line</h2>
                <p className={styles.paragraph}>{bottomLineParagraph}</p>
              </section>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className={styles.rightColumn}>
            {/* What You'll Discover */}
            <div className={styles.sidebarBox}>
              <h3 className={styles.sidebarTitle}>What You&apos;ll Discover</h3>
              <ul className={styles.sidebarList}>
                {sidebarDiscoverItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Top 6 Items to Consider */}
            <div className={styles.sidebarBox}>
              <h3 className={styles.sidebarTitle}>Top 6 Items to Consider</h3>
              <ul className={styles.sidebarList}>
                {sidebarTopItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Newsletter Box */}
            <div className={styles.newsletterBox}>
              <h3 className={styles.newsletterTitle}>{newsletterTitle}</h3>
              <p className={styles.newsletterDesc}>{newsletterDesc}</p>
              <form className={styles.newsletterForm}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className={styles.newsletterInput}
                />
                <button type="submit" className={styles.newsletterButton}>
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

