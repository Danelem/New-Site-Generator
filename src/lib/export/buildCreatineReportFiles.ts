import { CreatineReportProps } from "@/components/templates/CreatineReportTemplate";
import { CREATINE_REPORT_CSS } from "@/lib/templates/creatineReportCss";

export type StaticFile = {
  path: string;      // e.g. "index.html" or "styles.css"
  contents: string;  // file contents as string
};

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function renderStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  return '★'.repeat(fullStars) + (hasHalfStar ? '½' : '') + '☆'.repeat(emptyStars);
}

export function buildCreatineReportFiles(props: CreatineReportProps): StaticFile[] {
  const stars = renderStars(props.ratings.overallRating);
  const customerServiceStars = renderStars(props.ratings.customerService);
  const valueStars = renderStars(props.ratings.valueRating);
  const customerStars = renderStars(props.ratings.customerRating);

  const benefitsHtml = props.mainBenefits.length > 0
    ? `<ul class="benefits-list">
        ${props.mainBenefits.map(benefit => `<li>${escapeHtml(benefit)}</li>`).join('')}
      </ul>`
    : '';

  const effectivenessHtml = props.effectivenessParagraphs.length > 0
    ? `<section class="section">
        <h2 class="section-title">Effectiveness</h2>
        ${props.effectivenessParagraphs.map(p => `<p class="paragraph">${escapeHtml(p)}</p>`).join('')}
      </section>`
    : '';

  const comparisonHtml = props.comparisonParagraphs.length > 0
    ? `<section class="section">
        <h2 class="section-title">Comparison</h2>
        ${props.comparisonParagraphs.map(p => `<p class="paragraph">${escapeHtml(p)}</p>`).join('')}
      </section>`
    : '';

  const reviewsHtml = props.reviewParagraphs.length > 0
    ? `<section class="section">
        <h2 class="section-title">Reviews</h2>
        ${props.reviewParagraphs.map(p => `<p class="paragraph">${escapeHtml(p)}</p>`).join('')}
      </section>`
    : '';

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(props.pageTitle)}</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <div class="container">
    <!-- Brand Bar -->
    <div class="brand-bar">
      <div class="brand-inner">
        <span class="brand-logo">CR</span>
        <span class="brand-text">Creatine Report</span>
      </div>
    </div>

    <!-- Dark Nav Bar -->
    <nav class="nav-bar">
      <div class="nav-inner">
        <a href="#" class="nav-link">Top Products</a>
        <a href="#" class="nav-link">Creatine Information</a>
        <a href="#" class="nav-link">Product Comparison</a>
        <a href="#" class="nav-link">FAQ</a>
        <a href="#" class="nav-link">Contact Us</a>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="page-shell">
      <div class="page-inner">
        <!-- Left Column - Review Panel & Content -->
        <div>
          <div class="review-panel">
            <!-- Breadcrumb -->
            <div class="breadcrumb">${escapeHtml(props.breadcrumb)}</div>

            <!-- Page Title -->
            <h1 class="page-title">${escapeHtml(props.pageTitle)}</h1>
            <div class="updated-tag">${escapeHtml(props.updatedTag)}</div>

            <!-- Review Box -->
            <div class="review-box">
              <div class="review-header">
                <h2 class="review-title">${escapeHtml(props.productName)}</h2>
                <div class="overall-rating">
                  <div class="rating-value">${props.ratings.overallRating.toFixed(1)}</div>
                  <div class="rating-stars">
                    <span class="stars">${stars}</span>
                  </div>
                </div>
              </div>
              <div class="rating-grid">
                <div class="rating-item">
                  <span class="rating-label">Customer Service</span>
                  <span class="rating-score">
                    <span class="stars">${customerServiceStars}</span>
                  </span>
                </div>
                <div class="rating-item">
                  <span class="rating-label">Value Rating</span>
                  <span class="rating-score">
                    <span class="stars">${valueStars}</span>
                  </span>
                </div>
                <div class="rating-item">
                  <span class="rating-label">Customer Rating</span>
                  <span class="rating-score">
                    <span class="stars">${customerStars}</span>
                  </span>
                </div>
              </div>
              <div class="product-image">
                <div class="image-placeholder">${escapeHtml(props.productImageAlt)}</div>
              </div>
              <a href="${escapeHtml(props.productUrl)}" class="cta-button" target="_blank" rel="noopener noreferrer">
                View Product
              </a>
            </div>

            <!-- Main Lead -->
            <div class="main-lead">${escapeHtml(props.mainLead)}</div>

            <!-- Main Benefits -->
            ${benefitsHtml ? `<section class="section">
              <h2 class="section-title">Main Benefits</h2>
              ${benefitsHtml}
            </section>` : ''}

            <!-- Effectiveness -->
            ${effectivenessHtml}

            <!-- Comparison -->
            ${comparisonHtml}

            <!-- Reviews -->
            ${reviewsHtml}

            <!-- Bottom Line -->
            <section class="section">
              <h2 class="section-title">Bottom Line</h2>
              <p class="paragraph">${escapeHtml(props.bottomLineParagraph)}</p>
            </section>
          </div>
        </div>

        <!-- Right Column - Sidebar -->
        <div>
          <!-- What You'll Discover -->
          <div class="sidebar-box">
            <h3 class="sidebar-title">What You'll Discover</h3>
            <ul class="sidebar-list">
              ${props.sidebarDiscoverItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>

          <!-- Top 6 Items to Consider -->
          <div class="sidebar-box">
            <h3 class="sidebar-title">Top 6 Items to Consider</h3>
            <ul class="sidebar-list">
              ${props.sidebarTopItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>

          <!-- Newsletter Box -->
          <div class="newsletter-box">
            <h3 class="newsletter-title">${escapeHtml(props.newsletterTitle)}</h3>
            <p class="newsletter-desc">${escapeHtml(props.newsletterDesc)}</p>
            <form class="newsletter-form">
              <input type="email" placeholder="Enter your email" class="newsletter-input" />
              <button type="submit" class="newsletter-button">Subscribe</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script src="./main.js"></script>
</body>
</html>`;

  const mainJs = `console.log("Funnel page loaded");`;

  return [
    { path: 'index.html', contents: indexHtml },
    { path: 'styles.css', contents: CREATINE_REPORT_CSS },
    { path: 'main.js', contents: mainJs },
  ];
}

