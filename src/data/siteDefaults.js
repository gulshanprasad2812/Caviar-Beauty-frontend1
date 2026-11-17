/**
 * Fallback storefront settings. The API stores the editable copy; these values
 * keep the site rendering before the first request resolves (or if it fails).
 */
export const siteDefaults = {
  brandName: 'Caviar Beauty',
  tagline: 'Timeless luxury, handcrafted',
  supportEmail: 'hello@caviarbeauty.com',
  supportPhone: '+1 (555) 123-4567',
  whatsapp: '',
  address: '725 Fifth Avenue, New York, NY 10022',
  hours: 'Open daily 10AM - 8PM',
  instagramUrl: '',
  twitterUrl: '',
  linkedinUrl: '',
  youtubeUrl: '',
  footerBlurb:
    'Crafting timeless luxury since 2024. Each piece is a testament to extraordinary craftsmanship and uncompromising quality.',
  announcement: 'Complimentary shipping on orders above ₹5,000',
  announcementEnabled: false,
  heroSlides: [
    { title: 'Timeless Elegance', subtitle: 'Discover the new collection', cta: 'Shop Now', ctaHref: '/products', cta2: 'Explore Collection', cta2Href: '/collections' },
    { title: 'Luxury Redefined', subtitle: 'Handcrafted perfection', cta: 'Discover', ctaHref: '/products', cta2: 'View Lookbook', cta2Href: '/collections' },
    { title: 'The Art of Style', subtitle: 'Where craftsmanship meets design', cta: 'Explore', ctaHref: '/products', cta2: 'Our Story', cta2Href: '/about' },
  ],
};

export const aboutDefaults = {
  subtitle: 'Our Story',
  title: 'The Caviar Beauty Legacy',
  founded: 'Founded 2024',
  imageUrl: '',
  story: [
    'Caviar Beauty was born from a vision to create the world’s finest luxury accessories. Our founder, inspired by the ateliers of Paris and the craftsmanship of Italian artisans, set out to build a house that represents the pinnacle of elegance.',
    'Today, our pieces are worn by discerning clients in over 30 countries. From our flagship atelier in Milan to our boutique on Fifth Avenue, every Caviar Beauty creation carries the legacy of excellence.',
    'We believe in slow luxury — pieces that take weeks to create but last a lifetime. Our commitment to quality, sustainability, and timeless design sets us apart in the world of high fashion.',
  ],
  values: [
    { title: 'Craftsmanship', desc: 'Every piece is handcrafted by master artisans with decades of experience.' },
    { title: 'Sustainability', desc: 'Ethically sourced materials and responsible production practices.' },
    { title: 'Timeless Design', desc: 'Pieces designed to transcend seasons and trends.' },
    { title: 'Exclusivity', desc: 'Limited production runs ensure rarity and uniqueness.' },
  ],
};
