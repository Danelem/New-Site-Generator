import CreatineReportTemplate, { CreatineReportProps } from '@/components/templates/CreatineReportTemplate';

const sampleData: CreatineReportProps = {
  breadcrumb: 'Home > Reviews > Approved Science Creatine',
  pageTitle: 'Approved Science Creatine Review',
  updatedTag: 'Last updated: November 2024',
  productName: 'Approved Science Creatine',
  productImageAlt: 'Approved Science Creatine Product Image',
  mainLead: 'Approved Science Creatine is a high-quality creatine monohydrate supplement designed to support muscle growth, strength, and athletic performance. This comprehensive review examines its effectiveness, ingredients, and value for money.',
  mainBenefits: [
    'Increases muscle strength and power output',
    'Enhances muscle recovery after workouts',
    'Supports muscle growth and size gains',
    'Improves exercise performance and endurance',
    'Helps maintain muscle mass during training'
  ],
  effectivenessParagraphs: [
    'Approved Science Creatine contains pure creatine monohydrate, which is the most researched and proven form of creatine available. Studies consistently show that creatine monohydrate supplementation can increase muscle creatine stores by up to 40%, leading to improved performance in high-intensity activities.',
    'The product is manufactured in a GMP-certified facility, ensuring quality and purity. Each serving provides 5 grams of creatine monohydrate, which is the standard effective dose recommended by research.',
    'Users typically report noticeable improvements in strength and muscle fullness within 2-4 weeks of consistent use, especially when combined with proper training and nutrition.'
  ],
  comparisonParagraphs: [
    'Compared to other creatine supplements on the market, Approved Science Creatine offers excellent value. While some brands charge premium prices for "advanced" forms of creatine, research shows that creatine monohydrate is equally effective and often more cost-efficient.',
    'The product stands out for its purity and lack of unnecessary additives. Unlike some competitors that include fillers or proprietary blends, this supplement provides exactly what you need: pure creatine monohydrate.',
    'When compared to leading brands, Approved Science Creatine delivers similar results at a more affordable price point, making it an excellent choice for budget-conscious athletes and fitness enthusiasts.'
  ],
  reviewParagraphs: [
    'Customer reviews consistently praise the product for its effectiveness and value. Many users report significant strength gains and improved workout performance after just a few weeks of use.',
    'The powder mixes easily in water or juice, with minimal clumping. Some users note a slight chalky taste, which is common with creatine supplements, but it\'s generally well-tolerated.',
    'The packaging is functional and includes a scoop for easy measuring. The product arrives well-sealed and fresh, with a long shelf life when stored properly.'
  ],
  bottomLineParagraph: 'Approved Science Creatine is a solid choice for anyone looking to supplement with creatine monohydrate. It offers proven effectiveness, good value for money, and reliable quality. While it may not have the flashy marketing of premium brands, it delivers the results you need at a reasonable price. Recommended for athletes, bodybuilders, and fitness enthusiasts looking to enhance their performance and muscle gains.',
  ratings: {
    customerService: 4.5,
    valueRating: 4.8,
    customerRating: 4.6,
    overallRating: 4.6
  },
  productUrl: 'https://example.com/approved-science-creatine',
  sidebarDiscoverItems: [
    'How creatine monohydrate works in your body',
    'The science behind muscle strength gains',
    'Optimal dosing strategies for best results',
    'Common myths about creatine debunked',
    'How to cycle creatine effectively'
  ],
  sidebarTopItems: [
    'Purity and quality of ingredients',
    'Dosage and serving size',
    'Price and value for money',
    'Mixability and taste',
    'Customer reviews and ratings',
    'Third-party testing and certifications'
  ],
  newsletterTitle: 'Stay Updated',
  newsletterDesc: 'Get the latest creatine research, product reviews, and fitness tips delivered to your inbox.'
};

export default function PreviewPage() {
  return (
    <div>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '20px',
        backgroundColor: '#fff',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#333',
          margin: 0
        }}>
          Template Preview – Creatine Report (hard-coded data)
        </h2>
      </div>
      <CreatineReportTemplate {...sampleData} />
    </div>
  );
}

